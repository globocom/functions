const ERR_UNIMPLEMENTED_METHOD = 'unimplemented method for Storage interface'

class Storage {
    ping() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }

    putCode() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }

    getCode() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }

    deleteCode() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }

    getCodeByCache() { throw new Error(ERR_UNIMPLEMENTED_METHOD); }
}

module.exports = Storage;
