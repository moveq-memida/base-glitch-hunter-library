// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GlitchStamp {
    struct Stamp {
        address author;
        uint256 timestamp;
        string uri;
    }

    mapping(bytes32 => Stamp) private _stamps;

    event Stamped(bytes32 indexed hash, address indexed author, uint256 timestamp, string uri);

    function stamp(bytes32 hash, string calldata uri) external {
        require(hash != bytes32(0), "Invalid hash");
        require(_stamps[hash].author == address(0), "Already stamped");

        _stamps[hash] = Stamp({
            author: msg.sender,
            timestamp: block.timestamp,
            uri: uri
        });

        emit Stamped(hash, msg.sender, block.timestamp, uri);
    }

    function getStamp(bytes32 hash) external view returns (address author, uint256 timestamp, string memory uri) {
        Stamp storage s = _stamps[hash];
        require(s.author != address(0), "Not stamped");
        return (s.author, s.timestamp, s.uri);
    }
}

