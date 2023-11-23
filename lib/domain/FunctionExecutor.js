class FunctionExecutor {
    constructor() {
    }

    run() {
        throw Error("Class method not implemented");
    }
}


class FunctionExecutorFactory {

    getFunctionExecutor() {
        return new FunctionExecutor();
    }
}

module.exports = FunctionExecutorFactory;
