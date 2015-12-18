const minimal = `
  <form action="#">
    <input type="text" data-recurly="first_name">
    <input type="text" data-recurly="last_name">
    <div data-recurly="number"></div>
    <div data-recurly="month"></div>
    <div data-recurly="year"></div>
    <div data-recurly="cvv"></div>
    <input type="hidden" data-recurly="token" name="recurly-token">
  </form>
`;

const fixtures = {minimal};

export function fixture (name = '') {
  const body = global.document.body.innerHTML;

  before(() => global.document.body.innerHTML = fixtures[name] + body);
  after(() => global.document.body.innerHTML = body);
};
