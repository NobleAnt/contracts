import {advanceBlock} from 'zeppelin-solidity/test/helpers/advanceToBlock'
import {duration, increaseTimeTo} from 'zeppelin-solidity/test/helpers/increaseTime'
import latestTime from 'zeppelin-solidity/test/helpers/latestTime'
import ether from 'zeppelin-solidity/test/helpers/ether'
import BigNumber from 'bignumber.js'


require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

const PreSale = artifacts.require('PreSale')
const NANT = artifacts.require('NANT')

contract('PreSale', accounts => {
  const TokenCap = new BigNumber(10 ** 26)
  const owner = accounts[0]
  const investor1 = accounts[1]
  const investor2 = accounts[2]
  const investor3 = accounts[3]
  const investor4 = accounts[4]

  let StartTime, EndTime

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock()
    StartTime = latestTime() + 100
    EndTime = StartTime + duration.days(12)

    this.token = await NANT.new()
    this.contract = await PreSale.new(
      TokenCap.toString(),
      StartTime,
      EndTime,
      this.token.address
    )

    console.log(TokenCap.toString(),
      StartTime,
      EndTime,
      this.token.address)

    await this.token.transfer(this.contract.address, TokenCap.toString())
  })

  it('send funds', async function () {
    const amount = ether(1)
    await increaseTimeTo(StartTime + 100)
    await this.contract.confirm(investor3)
    await this.contract.buyTokens(investor1, {value: amount})
    await this.contract.buyTokensByReferrer(investor2, investor1, {value: amount})
    await this.contract.buyTokens(investor3, {value: amount})
  })

  it('send 10', async function () {
    const amount = ether(1)
    for(let i = 4; i< 10; i++) {
      await this.contract.buyTokens(accounts[i], {value: amount})
    }
    (await this.contract.topMap(investor1)).should.bignumber.equal(amount.div(20));

    await this.contract.buyTokens(owner, {value: amount});
    (await this.contract.topMap(investor1)).should.bignumber.equal(amount.div(10))
  })

  it('confirm', async function () {
    await this.contract.confirmBatch([investor1, investor2])
    // await this.contract.confirm(investor2)
  })

  it('setReferrer', async function () {
    await this.contract.setReferrer(investor2, {from: investor3})
  })

  it('setReferrer non loopback', async function () {
    await this.contract.setReferrer(investor2, {from: investor1}).should.be.rejected
    await this.contract.setReferrer(investor1, {from: investor1}).should.be.rejected
  })

  it('happy end', async function () {
    await increaseTimeTo(EndTime)
    await this.contract.setReached(true)
  })

  it('getTokens', async function () {
    await increaseTimeTo(EndTime + 3600 * 48)

    let t1 = await this.contract.calculateTokens.call(investor1)
    let t2 = await this.contract.calculateTokens.call(investor2)
    let t3 = await this.contract.calculateTokens.call(investor3)

    console.log('tokens', t1.add(t2).add(t3).toString(), TokenCap.toString())

    let b1 = await this.contract.calculateHolderPiece.call(investor1)
    let b2 = await this.contract.calculateHolderPiece.call(investor2)
    let b3 = await this.contract.calculateHolderPiece.call(investor3)

    console.log('eth', b1.toString(), b2.toString(), b3.toString())

    await this.contract.getTokens({from: investor1})
    await this.contract.getTokens({from: investor2})
    await this.contract.getTokens({from: investor3})

    let bal1 = await this.token.balanceOf.call(investor1)
    let bal2 = await this.token.balanceOf.call(investor2)
    let bal3 = await this.token.balanceOf.call(investor3)

    TokenCap.minus(bal1.add(bal2).add(bal3)).should.bignumber.equal(1)
  })

  it('getTokens not duplicate', async function () {
    await this.contract.getTokens({from: investor1}).should.be.rejected
  })

  it('get funds', async function () {
    await this.contract.getRaised()
    await web3.eth.getBalance(this.contract.address).should.bignumber.equal(ether(7))
  })

  it('refund', async function () {
    let balance = await web3.eth.getBalance(investor4)
    let {receipt} = await this.contract.getRefund({from: investor4})
    let newBalance = await web3.eth.getBalance(investor4)
    let fee = new web3.BigNumber(receipt.gasUsed).mul(10 ** 11)
    newBalance.minus(balance).plus(fee).should.bignumber.equal(ether(1))

    for(let i = 5; i< 10; i++) {
      await this.contract.getRefund({from: accounts[i]})
    }
    await this.contract.getRefund({from: owner})

    await web3.eth.getBalance(this.contract.address).should.bignumber.equal(0)
  })
})
