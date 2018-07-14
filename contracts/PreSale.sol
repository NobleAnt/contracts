pragma solidity ^0.4.23;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';

contract PreSale is Ownable {
    using SafeMath for uint256;

    uint256 public weiRaised;

    mapping(address => uint256) public unconfirmedMap;
    mapping(address => uint256) public confirmedMap;
    address[] public holders;
    mapping(address => uint) holdersOrder;

    mapping(address => uint256) public holdersGotTokens;

    mapping(address => address[]) _holderReferrals;
    mapping(address => address) _holderReferrer;

    mapping(address => uint256) bonusMap;
    uint256 confirmedAmount;
    uint256 bonusAmount;

    uint256 public totalSupply;

    uint REF_BONUS_PERCENT = 50;

    uint256 startTime;
    uint256 endTime;

    ERC20 token;

    constructor(
        uint256 _totalSupply,
        uint256 _startTime,
        uint256 _endTime,
        ERC20 _token
    ) public {
        totalSupply = _totalSupply;
        startTime = _startTime;
        endTime = _endTime;
        token = _token;
    }

    function getRaised() public finished onlyOwner {
        uint256 raised = address(this).balance;
        for (uint i = 0; i < holders.length; i++) {
            raised = raised.sub(unconfirmedMap[holders[i]]);
        }
        owner.transfer(raised);
    }

    modifier pending() {
        require(now >= startTime && now < endTime);
        _;
    }

    modifier finished() {
        require(now >= endTime);
        _;
    }

    modifier onlyConfirmed() {
        require(isConfirmed(msg.sender));
        _;
    }

    modifier onlyHolder() {
        require(confirmedMap[msg.sender] > 0 || unconfirmedMap[msg.sender] > 0);
        _;
    }

    function() payable public {
        buyTokens(msg.sender);
    }

    //TODO top of 10 or 15
    function addBonusOfTop(address holder, uint256 amount) internal {
        uint256 bonusOf = 0;

        if (holdersOrder[holder] < 10 || holdersOrder[holder] <= holders.length.div(10)) {
            bonusOf = amount.div(10);
        } else if (holdersOrder[holder] <= holders.length.mul(15).div(100)) {
            bonusOf = amount.mul(5).div(100);
        }

        if(bonusOf == 0) {
            return;
        }

        bonusMap[holder] = bonusMap[holder].add(bonusOf);

        if (isConfirmed(holder)) {
            bonusAmount = bonusAmount.add(bonusOf);
        }
    }

    function addBonusOfReferrer(address holder, uint256 amount) internal {
        if (_holderReferrer[holder] == 0x0) {
            return;
        }

        address referrer = _holderReferrer[holder];

        bonusMap[holder] = bonusMap[holder].add(amount.div(2));
        bonusMap[referrer] = bonusMap[referrer].add(amount.div(2));

        if (isConfirmed(holder)) {
            bonusAmount = bonusAmount.add(amount.div(2));
        }

        if (isConfirmed(referrer)) {
            bonusAmount = bonusAmount.add(amount.div(2));
        }
    }

    function addBonus(address holder, uint256 amount) internal {
//        addBonusOfTop(holder, amount);
        addBonusOfReferrer(holder, amount);
    }

    function buyTokens(address holder) payable public pending {
        if (isConfirmed(holder)) {
            confirmedMap[holder] = confirmedMap[holder].add(msg.value);
        } else {
            unconfirmedMap[holder] = unconfirmedMap[holder].add(msg.value);
        }

        holders.push(holder);
        holdersOrder[holder] = holders.length;

        addBonus(holder, msg.value);
    }

    function setReferrer(address referrer) public onlyHolder {
        address holder = msg.sender;
        require(_holderReferrer[holder] == 0x0);
        require(_holderReferrer[referrer] != holder);

        _holderReferrer[msg.sender] = referrer;

        if (isConfirmed(holder)) {
            addBonus(holder, confirmedMap[holder]);
        } else {
            addBonus(holder, unconfirmedMap[holder]);
        }
    }

    function confirm(address holder) public pending onlyOwner {
        confirmedMap[holder] = unconfirmedMap[holder];
        unconfirmedMap[holder] = 0;

        confirmedAmount = confirmedAmount.add(confirmedMap[holder]);
        bonusAmount = bonusAmount.add(bonusMap[holder]);
    }

    function isConfirmed(address holder) public view returns (bool) {
        return confirmedMap[holder] > 0;
    }

    function getTokens() public finished onlyConfirmed returns (uint256) {
        require(confirmedMap[msg.sender] > 0);
        uint256 tokens = calculateTokens(msg.sender);
        confirmedMap[msg.sender] = 0;
        require(token.transfer(msg.sender, tokens));
    }

    function getRefund() public finished {
        uint256 funds = unconfirmedMap[msg.sender];
        require(funds > 0);

        unconfirmedMap[msg.sender] = 0;
        msg.sender.transfer(funds);
    }

    function calculateTokens(address holder) public view returns (uint256) {
        return totalSupply.mul(calculateHolderPiece(holder)).div(calculatePie());
    }

    function calculatePie() public view returns (uint256) {
        return confirmedAmount.add(bonusAmount);
    }

    function calculateHolderPiece(address holder) public view returns (uint256){
        return confirmedMap[holder].add(bonusMap[holder]);
    }
}
