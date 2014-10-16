[![browser support](https://ci.testling.com/kewah/mixin.png)](https://ci.testling.com/kewah/mixin)

# mixin

  ES5 compatible mixin

## Installation

    $ component install kewah/mixin

## API

   var a = {
     foo: 'bar',
     toto: 'tata'
   };

   var b = {};

   mixin(b, a);

   assert(b.foo === 'bar');
   assert(b.toto === 'tata');

## License

  MIT
