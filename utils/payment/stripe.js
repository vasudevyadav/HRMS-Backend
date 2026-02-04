const Publishable_Key = 'Your Publishable key';
const Secret_Key = 'Your Secret key';
const stripe = require('stripe')(Secret_Key);

// this route will be called when pay button from web will be clicked to make the payment
app.post('/payment', function (req, res) {
  /*
   * Moreover you can take more details from user
   * like Address, Name, etc from form
   */
  stripe.customers
    .create({
      email: req.body.stripeEmail,
      source: req.body.stripeToken,
      name: 'John Doe',
      address: {
        line1: 'TC 9/4 Old MES colony',
        postal_code: '452331',
        city: 'Indore',
        state: 'Madhya Pradesh',
        country: 'India',
      },
    })
    .then((customer) => {
      return stripe.charges.create({
        amount: 2500, // order amount
        description: 'Web Development Product',
        currency: 'INR',
        customer: customer.id,
      });
    })
    .then((charge) => {
      res.send('Success'); // If no error occurs
    })
    .catch((err) => {
      res.send(err); // If some error occurs
    });
});