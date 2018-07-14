require('babel-register')({ignore: /node_modules\/(?!zeppelin-solidity)/})
require('babel-polyfill')

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 2900000
    },
    ropsten: {
      network_id: 3,
      host: 'localhost',
      port: 8545,
      gas: 2900000,
    },
  },
  rpc: {
    host: 'localhost',
    post: 8080,
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
}
