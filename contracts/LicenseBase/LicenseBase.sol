//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract LicenseBase is Initializable {
    string private _name;
    string private _symbol;
    string private _dimoURI;

    mapping(uint256 => address) private _owners;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => uint256) private _balances;

    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );

    /** @dev initialize the upgradeable contract
     *  @param name_ LICENSE name
     *  @param symbol_ LICENSE symbol
     */
    function __LicenseBase_init(string memory name_, string memory symbol_)
        internal
        initializer
    {
        _name = name_;
        _symbol = symbol_;
    }

    /** @dev returns token name metadata
     */
    function name() public view virtual returns (string memory) {
        return _name;
    }

    /** @dev returns token symbol metadata
     */
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        returns (string memory)
    {
        require(_exists(tokenId), "tokenURI: token doesn't exist");

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overridden in child contracts.
     */
    function _baseURI() public view virtual returns (string memory) {
        return _dimoURI;
    }

    /**
     * @dev See {IERC721-balanceOf}.
     */
    function balanceOf(address owner) public view virtual returns (uint256) {
        require(
            owner != address(0),
            "balanceOf: address zero is not a valid owner"
        );
        return _balances[owner];
    }

    /**
     * @dev See {IERC721-ownerOf}.
     */
    function ownerOf(uint256 tokenId) public view virtual returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ownerOf: token doesn't exist");
        return owner;
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
     *
     * Tokens start existing when they are minted (`_mint`),
     * and stop existing when they are burned (`_burn`).
     */
    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _owners[tokenId] != address(0);
    }

    /** @dev set the tokenURI
     *  @param dimoURI new URI (ex https://dimo.zone/)
     */
    function _setDimoURI(string memory dimoURI) internal {
        _dimoURI = dimoURI;
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {_safeMint} whenever possible
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - `to` cannot be the zero address.
     *
     * Emits a {Transfer} event.
     */
    function _mint(address to, uint256 tokenId) internal virtual {
        require(!_exists(tokenId), "mint: tokenID exists");

        _balances[to] += 1;
        _owners[tokenId] = to;
        _tokenURIs[tokenId] = Strings.toString(tokenId);
        emit Transfer(address(0), to, tokenId);
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     * This is an internal function that does not check if the sender is authorized to operate on the token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function _burn(uint256 tokenId) internal virtual {
        address owner = ownerOf(tokenId);

        _balances[owner] -= 1;
        delete _owners[tokenId];
        delete _tokenURIs[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }
}
