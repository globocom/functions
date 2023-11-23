const BackstageFunctionExecutor = require('./BackstageFunctionExecutor');
const GoogleFunctionExecutor = require('./GoogleFunctionExecutor');


const FunctionExecutors = {
    BackstageExecutor: 'backstage-executor',
    GoogleExecutor: 'google-executor'
}

class FunctionExecutor {

    static toEnum(executorStr) {
        let executorEnum;
        switch(executorStr) {
            case FunctionExecutors.GoogleExecutor.toString():
                executorEnum = FunctionExecutors.GoogleExecutor;
                break;
            default:
                executorEnum = FunctionExecutors.BackstageExecutor;
                break;
        }
        return executorEnum;
    }

    run() {
        throw Error("Class method not implemented");
    }
}

class FunctionExecutorFactory {

    getFunctionExecutor(executorStr) {
        let executor;
        const executorEnum = FunctionExecutor.toEnum(executorStr);
        switch(executorEnum) {
            case FunctionExecutors.GoogleExecutor:
              executor = new GoogleFunctionExecutor()
              break;
            default:
              executor = new BackstageFunctionExecutor();
              break;
        }
        return executor;
    }
}

module.exports = {
    FunctionExecutor: FunctionExecutor,
    FunctionExecutorFactory: FunctionExecutorFactory
}
