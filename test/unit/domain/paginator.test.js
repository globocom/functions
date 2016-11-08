const Paginator = require('../../../lib/domain/paginator');
const expect = require('chai').expect;

describe.only('Paginator', () => {
  describe('when there are no items to paginate', () => {
    const paginator = new Paginator();

    paginator.isValid();

    it('should show an error', () => {
      expect(paginator.error).to.be.eql('There are no items to paginate');
    });
  });

  describe('when page is lower than 1', () => {
    const paginator = new Paginator(0, 10, 100);

    paginator.isValid();

    it('should show an error', () => {
      expect(paginator.error).to.be.eql('Page and / or Per Page cannot be lower than 1');
    });
  });

  describe('when perPage is lower than 1', () => {
    const paginator = new Paginator(1, 0, 100);

    paginator.isValid();

    it('should show an error', () => {
      expect(paginator.error).to.be.eql('Page and / or Per Page cannot be lower than 1');
    });
  });

  describe('when page is higher than totalPages', () => {
    const paginator = new Paginator(12, 10, 100);

    paginator.isValid();

    it('should show an error', () => {
      expect(paginator.error).to.be.eql(`Page cannot be higher than ${paginator.totalPages}`);
    });
  });

  describe('when there are 100 items with 10 items per page to paginate', () => {
    const paginator = new Paginator(1, 10, 100);

    it('should have 10 pages', () => {
      expect(paginator.totalPages).to.be.eql(10);
    });
  });
});
