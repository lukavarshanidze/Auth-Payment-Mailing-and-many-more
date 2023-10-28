const fileHelper = require('../util/file')

const Product = require('../models/product');


exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file
  const price = req.body.price;
  const description = req.body.description;
  if (!image) {
    return res.redirect('/500')
  }
  const imageUrl = image.path;
  req.user.createProduct({
    title: title,
    price: price,
    imageUrl: imageUrl,
    description: description,
  })
    .then(result => {
      console.log('Produ ct Created');
      res.redirect('/admin/products')
    }).catch(err => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit
  if (!editMode) {
    return res.redirect('/')
  };
  const prodId = req.params.productId;

  Product.findByPk(prodId)
    .then(product => {
      if (product.userId !== req.user.id) {
        return res.redirect('/');
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/add-product",
        editing: editMode,
        product: product,
      });
    })
    .catch(err => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    })
};

exports.postEditProducts = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;


  Product.findByPk(prodId)
    .then(product => {
      if (product.userId !== req.user.id) {
        return res.redirect('/')
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      if (image) {
        fileHelper.deleteFile(product.imageUrl)
        product.imageUrl = image.path;
      }
      product.description = updatedDesc;
      return product.save().then(result => {
        res.redirect('/admin/products')
      })
    })
    .catch(err => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    })
};

exports.getProducts = (req, res, next) => {
  // req.user
  //   .getProducts()
  Product.findAll({ where: { userId: req.user.id } })
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: "/admin/products",
      });
    })
    .catch(err => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      return next(error)
    })
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findByPk(prodId)
    .then(product => {
      if (product.userId !== req.user.id) {
        return res.redirect('/')
      }
      return product.destroy().then(result => {
        res.status(200).json({ message: "Success!" })
      })
    })
    .catch(err => {
      res.status(500).json({ message: "Deleting Product Failed" });
    })
};


