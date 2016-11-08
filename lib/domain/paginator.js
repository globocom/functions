class Paginator {
  constructor(page = 1, perPage = 10, total = 0) {
    this.page = page;
    this.perPage = perPage;
    this.total = total;

    this.totalPages = Math.ceil(this.total / this.perPage);
    this.previousPage = this.page === 1 ? null : this.page - 1;
    this.nextPage = this.page >= this.totalPages ? null : this.page + 1;

    this.start = (this.page * this.perPage) - this.perPage;
    this.stop = (this.page * this.perPage) - 1;

    this.error = null;
  }

  isValid() {
    if (this.page < 1 || this.perPage < 1) {
      this.error = 'Page and / or Per Page cannot be lower than 1';

      return false;
    }

    if (this.page > this.totalPages && this.totalPages > 0) {
      this.error = `Page cannot be higher than ${this.totalPages}`;

      return false;
    }

    if (this.total <= 0) {
      this.error = 'There are no items to paginate';

      return false;
    }

    return true;
  }
}

module.exports = Paginator;
