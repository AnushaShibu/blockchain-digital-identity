// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Blockchain-Based Digital Identity System (Mini Project)
 * Roles: Admin (deployer), Issuer (trusted authority), User (holder), Verifier (anyone)
 * Privacy: only hashes are stored on-chain, never raw personal data.
 */
contract DigitalIdentity {
    // ---------- Roles ----------
    address public admin;
    mapping(address => bool) public isIssuer;

    // ---------- Identity ----------
    struct Identity {
        bool registered;
        bytes32 profileHash;   // hash of name/DOB etc. (computed off-chain)
        uint256 registeredAt;
    }
    mapping(address => Identity) public identities;

    // ---------- Credentials ----------
    struct Credential {
        uint256 id;
        address holder;
        address issuer;
        string credType;       // e.g. "Aadhaar", "Degree", "Student ID"
        bytes32 dataHash;      // hash of the document/data
        uint256 issuedAt;
        uint256 expiresAt;     // 0 = never expires
        bool revoked;
    }
    uint256 public credentialCount;
    mapping(uint256 => Credential) private credentials;
    mapping(address => uint256[]) private holderCredentials;

    // ---------- Events ----------
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event IdentityRegistered(address indexed user, bytes32 profileHash);
    event CredentialIssued(uint256 indexed id, address indexed holder, address indexed issuer, string credType);
    event CredentialRevoked(uint256 indexed id, address indexed issuer);

    // ---------- Modifiers ----------
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyIssuer() {
        require(isIssuer[msg.sender], "Only issuer");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // ---------- Admin ----------
    function addIssuer(address _issuer) external onlyAdmin {
        require(_issuer != address(0), "Zero address");
        isIssuer[_issuer] = true;
        emit IssuerAdded(_issuer);
    }

    function removeIssuer(address _issuer) external onlyAdmin {
        isIssuer[_issuer] = false;
        emit IssuerRemoved(_issuer);
    }

    // ---------- User ----------
    function registerIdentity(bytes32 _profileHash) external {
        require(!identities[msg.sender].registered, "Already registered");
        identities[msg.sender] = Identity(true, _profileHash, block.timestamp);
        emit IdentityRegistered(msg.sender, _profileHash);
    }

    function getMyCredentialIds() external view returns (uint256[] memory) {
        return holderCredentials[msg.sender];
    }

    // ---------- Issuer ----------
    function issueCredential(
        address _holder,
        string calldata _credType,
        bytes32 _dataHash,
        uint256 _validForSeconds   // 0 = no expiry
    ) external onlyIssuer returns (uint256) {
        require(identities[_holder].registered, "Holder not registered");

        credentialCount++;
        uint256 id = credentialCount;
        uint256 expiry = _validForSeconds == 0 ? 0 : block.timestamp + _validForSeconds;

        credentials[id] = Credential(
            id, _holder, msg.sender, _credType, _dataHash,
            block.timestamp, expiry, false
        );
        holderCredentials[_holder].push(id);

        emit CredentialIssued(id, _holder, msg.sender, _credType);
        return id;
    }

    function revokeCredential(uint256 _id) external {
        Credential storage c = credentials[_id];
        require(c.id != 0, "Credential not found");
        require(c.issuer == msg.sender, "Only original issuer");
        require(!c.revoked, "Already revoked");
        c.revoked = true;
        emit CredentialRevoked(_id, msg.sender);
    }

    // ---------- Verifier (public) ----------
    function getCredential(uint256 _id) external view returns (Credential memory) {
        require(credentials[_id].id != 0, "Credential not found");
        return credentials[_id];
    }

    /// Returns true only if the credential exists, matches the given hash,
    /// is not revoked, not expired, and was issued by a currently trusted issuer.
    function verifyCredential(uint256 _id, bytes32 _dataHash) external view returns (bool) {
        Credential memory c = credentials[_id];
        if (c.id == 0) return false;
        if (c.dataHash != _dataHash) return false;
        if (c.revoked) return false;
        if (c.expiresAt != 0 && block.timestamp > c.expiresAt) return false;
        if (!isIssuer[c.issuer]) return false;
        return true;
    }
}
