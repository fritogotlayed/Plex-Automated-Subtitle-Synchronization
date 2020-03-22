const fs = require('fs');
const chai = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const utils = require('./utils');

describe('utils', () => {
  beforeEach(() => {
    this.sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    this.sandbox.restore();
  });

  // https://www.chaijs.com/plugins/chai-as-promised/
  describe('download', () => {
    it('Resolves promise on successful download', () => {
      // Arrange
      const url = 'http://127.0.0.1:8000/download/foo/bar.txt';
      const dest = '/foo/baz';
      const stubCreateWriteStream = this.sandbox.stub(fs, 'createWriteStream');
      const stubAxiosGet = this.sandbox.stub(axios, 'get');
      const fakeWriter = {
        on: (event, listener) => {
          if (event === 'finish') {
            setTimeout(listener, 1);
          }
        },
      };
      const fakeResponse = {
        data: {
          pipe: this.sandbox.stub(),
        },
      };

      stubCreateWriteStream.returns(fakeWriter);
      stubAxiosGet.resolves(fakeResponse);

      // Act
      return utils.download(url, dest)
        .then(() => {
          // Assert
          const stubCreateWriteStreamCalls = stubCreateWriteStream.getCalls();
          chai.expect(stubCreateWriteStreamCalls.length).to.be.equal(1);
          chai.expect(stubCreateWriteStreamCalls[0].args[0]).to.be.equal('/foo/baz/bar.txt');

          const pipeCalls = fakeResponse.data.pipe.getCalls();
          chai.expect(pipeCalls.length).to.be.equal(1);
          chai.expect(pipeCalls[0].args[0]).to.be.equal(fakeWriter);
        });
    });
  });
});
