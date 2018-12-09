const shim = require('fabric-shim');
const util = require('util');

const Chaincode = class {
    async Init(stub) {
        console.log('==== account transfer');

        return shim.success();
    }

    async Invoke(stub) {
        let ret = stub.getFunctionAndParameters();
        console.log('getFuncAndParams:', ret);

        let method = this[ret.fcn];
        let thisClass = this;
        if (!method) {
            console.log('no method of name:' + ret.fcn + ' found');
            return shim.success();
        }

        try {
            let payload = await method(stub, ret.params, thisClass);
            return shim.success(payload);
        } catch (err) {
            console.log(err);
            return shim.error(err);
        }
    }

    async openAccount(stub, args) {
        if (args.length !== 2) {
            throw new Error('Incorrect number of arguments. Expectiong 2');
        }

        let userA = args[0];

        if (!userA) {
            throw new Error('asset holding must not be empty');
        }

        await stub.putState(userA, Buffer.from(args[1]));
    }

    async transfer(stub, args) {
        if (args.length !== 3) {
            throw new Error('Incorrect number of arguments. Expectiong');
        }

        let userA = args[0];
        let amt = parseInt(args[1]);
        let userB = args[2];
        
        try {
            let amtABytes = await stub.getState(userA);

            if (!amtABytes) {
                throw new Error('Failed to get state of asset holder UserA');
            }

            let amtBBytes = await stub.getState(userB);
            if (!amtBBytes) {
                throw new Error('Failed to get state of asset holder UserB');
            }
          
            let amtA = parseInt(amtABytes.toString())
            let amtB = parseInt(amtBBytes.toString())
            amtA = amtA - amt;
            amtB = amtB + amt;

            await stub.putState(userA, Buffer.from(amtA.toString()));
            await stub.putState(userB, Buffer.from(amtB.toString()));
        } catch (err) {
            console.log(err);
            return shim.error(err);
        }
    }

    async inquire(stub, args) {
        if (args.length != 1) {
            throw new Error('Incorrect number of arguments. Expectiong 1')
        }

        let jsonResp = {};
        let userA = args[0];

        let amtBytes = await stub.getState(userA);
        if (!amtBytes) {
            jsonResp.error = 'Failed to get state for '+userA;
            throw new Error(JSON.stringify(jsonResp));
        }

        jsonResp.name = userA;
        jsonResp.amout = amtBytes.toString();

        console.info('Query Response:');
        console.info(jsonResp);

        return amtBytes;
    }

    async search(stub, args, thisClass) {
        //   0
        // 'queryString'
        console.info('inquire2 Query Response:');
        if (args.length < 1) {
          throw new Error('Incorrect number of arguments. Expecting queryString');
        }

        let queryString = args[0];
        if (!queryString) {
          throw new Error('queryString must not be empty');
        }
        let method = thisClass['executeQuery'];
        let queryResults = await method(stub, queryString, thisClass);
        return queryResults;
      }
    
    // =========================================================================================
    // executeQuery executes the passed in query string.
    // Result set is built and returned as a byte array containing the JSON results.
    // =========================================================================================
    async executeQuery(stub, queryString, thisClass) {
        console.info('- getQueryResultForQueryString queryString:\n' + queryString)
        let resultIterator = await stub.getQueryResult(queryString);
        let method = thisClass['convert'];

        let results = await method(resultIterator, false);
    
        return Buffer.from(JSON.stringify(results));
    }

    async convert(iterator, isHistory) {
        let allResults = [];
        while (true) {
          let res = await iterator.next();
    
          if (res.value && res.value.value.toString()) {
            let jsonRes = {};
            console.log(res.value.value.toString('utf8'));
    
            if (isHistory && isHistory === true) {
              jsonRes.TxId = res.value.tx_id;
              jsonRes.Timestamp = res.value.timestamp;
              jsonRes.IsDelete = res.value.is_delete.toString();
              try {
                jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
              } catch (err) {
                console.log(err);
                jsonRes.Value = res.value.value.toString('utf8');
              }
            } else {
              jsonRes.Key = res.value.key;
              try {
                jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
              } catch (err) {
                console.log(err);
                jsonRes.Record = res.value.value.toString('utf8');
              }
            }
            allResults.push(jsonRes);
          }
          if (res.done) {
            console.log('end of data');
            await iterator.close();
            console.info(allResults);
            return allResults;
          }
        }
    }
}

shim.start(new Chaincode());