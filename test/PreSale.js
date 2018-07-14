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

    await this.token.transfer(this.contract.address, TokenCap.toString())
  })

  it('send funds', async function () {
    const amount = ether(1)
    await increaseTimeTo(StartTime + 100)
    await this.contract.buyTokens(investor1, {value: amount})
    await this.contract.buyTokens(investor2, {value: amount})
    await this.contract.buyTokens(investor3, {value: amount})
    await this.contract.buyTokens(investor4, {value: amount})
  })

  it('confirm', async function () {
    await this.contract.confirm(investor1)
    await this.contract.confirm(investor2)
    await this.contract.confirm(investor3)
    // await this.contract.confirm(investor4)
  })

  it('getRefBonus success', async function () {
    await this.contract.setReferrer(investor1, {from: investor2})
  })

  it('getRefBonus non loopback', async function () {
    await this.contract.setReferrer(investor2, {from: investor1}).should.be.rejected
  })

  it('getTokens', async function () {
    await increaseTimeTo(EndTime + 100)
    await this.contract.getTokens({from: investor1})
    await this.contract.getTokens({from: investor2})
    await this.contract.getTokens({from: investor3})
    // await this.contract.getTokens({from: investor4})

    let bal1 = await this.token.balanceOf.call(investor1)
    let bal2 = await this.token.balanceOf.call(investor2)
    let bal3 = await this.token.balanceOf.call(investor3)
    // let bal4 = await this.token.balanceOf.call(investor4)

    console.log(bal1.toString(), bal2.toString(), bal3.toString());

    bal1.should.bignumber.equal(bal2)
    TokenCap.should.bignumber.equal(bal1.add(bal2).add(bal3))
  })

  it('getTokens not duplicate', async function () {
    await this.contract.getTokens({from: investor1}).should.be.rejected
  })

  it('get funds', async function () {
    let balance = await web3.eth.getBalance(owner)
    await web3.eth.getBalance(this.contract.address).should.bignumber.equal(ether(4))
    let {receipt} = await this.contract.getRaised()
    let newBalance = await web3.eth.getBalance(owner)
    let fee = new web3.BigNumber(receipt.gasUsed).mul(10 ** 11)
    newBalance.minus(balance).plus(fee).should.bignumber.equal(ether(3))

    await web3.eth.getBalance(this.contract.address).should.bignumber.equal(ether(1))
  })

  it('refund', async function () {
    let balance = await web3.eth.getBalance(investor4)
    let {receipt} = await this.contract.getRefund({from: investor4})
    let newBalance = await web3.eth.getBalance(investor4)
    let fee = new web3.BigNumber(receipt.gasUsed).mul(10 ** 11)
    newBalance.minus(balance).plus(fee).should.bignumber.equal(ether(1))

    await web3.eth.getBalance(this.contract.address).should.bignumber.equal(0)
  })
})
