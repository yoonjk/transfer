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

        if (!method) {
            console.log('no method of name:' + ret.fcn + ' found');
            return shim.success();
        }

        try {
            let payload = await method(stub, ret.params)
            return shim.success(payload);
        } catch (err) {
            console.log(err);
            return shim.error(err);
        }
    }

    async openAccount(stub, args) {
        if (args.length !== 2) {
            throw new Error('Incorrect number of arguments. Expectiong 2')
        }

        let userA = args[0];

        if (!userA) {
            throw new Error('asset holding must not be empty')
        }

        await stub.putState(userA, Buffer.from(args[1]))
    }

    async transfer(stub, args) {
        if (args.length !== 3) {
            throw new Error('Incorrect number of arguments. Expectiong')
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
}

shim.start(new Chaincode());