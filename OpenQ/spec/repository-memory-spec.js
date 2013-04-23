var memoryRepo = require('../repository-memory.ts');
describe('When creating a new memory repo, ', function () {
    var repo = memoryRepo.createRepository('tablename');
    it('then a non-null instance is returned', function () {
        expect(repo).not.toBeNull();
    });
    it('then the repository has the correct table name', function () {
        expect(repo.tableName).toBe('tablename');
    });
    describe('When reading an empty repository, ', function () {
        var messages;
        repo.read('type', 0, 1, function (results) {
            messages = results;
        });
        it('then the result is an empty array', function () {
            expect(messages).not.toBeNull();
            expect(messages.length).toBe(0);
        });
    });
    describe('When writing a new message with expected qid of -1, ', function () {
        var newMessage = {
            type: 'urn:test'
        };
        var error;
        repo.write([
            newMessage
        ], 0, function (err) {
            error = err;
        });
        it('then no error is raised', function () {
            return expect(error).toBeNull();
        });
        describe('When reading the first message of the correct type, ', function () {
            var readMessages;
            repo.read('urn:test', 0, 1, function (results) {
                readMessages = results;
            });
            it('then one message is read', function () {
                expect(readMessages).not.toBeNull();
                expect(readMessages.length).toBe(1);
            });
            it('then the first message is the previously written message', function () {
                expect(readMessages[0]).not.toBeNull();
                expect(readMessages[0].type).toBe('urn:test');
            });
            it('then the first message has a qid of zero', function () {
                expect(readMessages[0].qid).toBe(0);
            });
        });
        describe('When reading the second message of the correct type, ', function () {
            var readMessages;
            repo.read('urn:test', 1, 1, function (results) {
                readMessages = results;
            });
            it('then zero messages are read', function () {
                expect(readMessages).not.toBeNull();
                expect(readMessages.length).toBe(0);
            });
        });
        describe('When reading the first message of a different type, ', function () {
            var readMessages;
            repo.read('urn:test2', 0, 1, function (results) {
                readMessages = results;
            });
            it('then zero messages are read', function () {
                expect(readMessages).not.toBeNull();
                expect(readMessages.length).toBe(0);
            });
        });
    });
});
