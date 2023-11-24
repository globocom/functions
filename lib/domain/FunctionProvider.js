const BackstageFunctionProvider = require('./BackstageFunctionProvider');
const GoogleFunctionProvider = require('./GoogleFunctionProvider');


const FunctionProviders = {
  BackstageProvider: 'backstage-executor',
  GoogleProvider: 'google-executor'
}

class FunctionProvider {

    static toEnum(providerStr) {
        let providerEnum;
        switch(providerStr) {
            case FunctionProviders.GoogleProvider.toString():
                providerEnum = FunctionProviders.GoogleProvider;
                break;
            default:
                providerEnum = FunctionProviders.BackstageProvider;
                break;
        }
        return providerEnum;
    }

    run() {
        throw Error("Class method not implemented");
    }
}

class FunctionProviderFactory {

    getFunctionProvider(providerStr) {
        let provider;
        const providerEnum = FunctionProvider.toEnum(providerStr);
        switch(providerEnum) {
            case FunctionProviders.GoogleProvider:
              provider = new GoogleFunctionProvider()
              break;
            default:
              provider = new BackstageFunctionProvider();
              break;
        }
        return provider;
    }
}

module.exports = {
    FunctionProvider: FunctionProvider,
    FunctionProviderFactory: FunctionProviderFactory
}
