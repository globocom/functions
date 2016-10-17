const expect = require('chai').expect;

const linkRewriter = require('../../../../lib/domain/schemas/linkRewriter.js');

describe('linkRewriter', () => {
  const baseUrl = 'http://example.org';
  let body;
  let originalBody;

  beforeEach(() => {
    originalBody = {};
  });

  describe('when links href is relative', () => {
    beforeEach(() => {
      originalBody.links = [
        { href: '/relative' },
      ];

      body = linkRewriter(baseUrl, originalBody);
    });

    it('should make href absolute', () => {
      expect(body.links[0].href).to.eq('http://example.org/relative');
    });
  });

  describe('when links href is relative', () => {
    beforeEach(() => {
      originalBody.links = [
        { $ref: '/relative' },
      ];

      body = linkRewriter(baseUrl, originalBody);
    });

    it('should make $ref absolute', () => {
      expect(body.links[0].$ref).to.eq('http://example.org/relative');
    });
  });


  describe('when links href is absolute', () => {
    beforeEach(() => {
      originalBody.links = [
        { href: 'http://example.org/absolute' },
      ];

      body = linkRewriter(baseUrl, originalBody);
    });

    it('should do nothing', () => {
      expect(body.links[0].href).to.eq('http://example.org/absolute');
    });
  });

  describe('when links do not exist', () => {
    beforeEach(() => {
      originalBody.links = undefined;
      body = linkRewriter(baseUrl, originalBody);
    });

    it('should do nothing', () => {
      expect(body.links).to.be.undefined;
    });
  });

  describe('when no keys with url exist', () => {
    beforeEach(() => {
      originalBody.links = [{}];
      body = linkRewriter(baseUrl, originalBody);
    });

    it('should do nothing', () => {
      expect(body.links[0]).to.eql({});
    });
  });

  describe('when href is a child of something other than links', () => {
    beforeEach(() => {
      originalBody.properties = {
        href: '/relative',
      };
      originalBody.items = {
        href: '/relative',
      };
      body = linkRewriter(baseUrl, originalBody);
    });

    it('should do nothing', () => {
      expect(body.properties.href).to.eq('/relative');
      expect(body.items.href).to.eq('/relative');
    });
  });

  describe('when items.$ref is present on properties', () => {
    beforeEach(() => {
      originalBody.properties = {
        items: {
          type: 'array',
          items: {
            $ref: '/relative',
          },
        },
      };
      body = linkRewriter(baseUrl, originalBody);
    });

    it('should make $ref absolute', () => {
      expect(body.properties.items.items.$ref).to.eq('http://example.org/relative');
    });
  });
});
