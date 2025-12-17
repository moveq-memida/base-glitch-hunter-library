// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GlitchRegistry {
    struct Glitch {
        address author;
        bytes32 contentHash;
        uint256 createdAt;
    }

    mapping(uint256 => Glitch) public glitches;
    uint256 public nextGlitchId;

    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => uint256) public voteCount;

    event GlitchSubmitted(uint256 indexed glitchId, address indexed author, bytes32 contentHash);
    event GlitchUpvoted(uint256 indexed glitchId, address indexed voter);

    /**
     * @dev Submit a new glitch with content hash
     * @param contentHash The keccak256 hash of the glitch metadata JSON
     * @return glitchId The ID of the newly created glitch
     */
    function submitGlitch(bytes32 contentHash) external returns (uint256 glitchId) {
        glitchId = nextGlitchId;

        glitches[glitchId] = Glitch({
            author: msg.sender,
            contentHash: contentHash,
            createdAt: block.timestamp
        });

        nextGlitchId++;

        emit GlitchSubmitted(glitchId, msg.sender, contentHash);
    }

    /**
     * @dev Upvote a glitch (one vote per address per glitch)
     * @param glitchId The ID of the glitch to upvote
     */
    function upvote(uint256 glitchId) external {
        require(glitchId < nextGlitchId, "Invalid glitch ID");
        require(!hasVoted[glitchId][msg.sender], "Already voted");

        hasVoted[glitchId][msg.sender] = true;
        voteCount[glitchId] += 1;

        emit GlitchUpvoted(glitchId, msg.sender);
    }

    /**
     * @dev Get glitch details
     * @param glitchId The ID of the glitch
     * @return The glitch struct
     */
    function getGlitch(uint256 glitchId) external view returns (Glitch memory) {
        require(glitchId < nextGlitchId, "Invalid glitch ID");
        return glitches[glitchId];
    }

    /**
     * @dev Get vote count for a glitch
     * @param glitchId The ID of the glitch
     * @return The number of votes
     */
    function getVoteCount(uint256 glitchId) external view returns (uint256) {
        require(glitchId < nextGlitchId, "Invalid glitch ID");
        return voteCount[glitchId];
    }

    /**
     * @dev Check if an address has voted for a glitch
     * @param glitchId The ID of the glitch
     * @param voter The address to check
     * @return Whether the address has voted
     */
    function hasUserVoted(uint256 glitchId, address voter) external view returns (bool) {
        require(glitchId < nextGlitchId, "Invalid glitch ID");
        return hasVoted[glitchId][voter];
    }
}
