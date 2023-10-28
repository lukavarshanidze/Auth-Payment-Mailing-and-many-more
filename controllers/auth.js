require('dotenv').config()
const crypto = require('crypto')
const { Op, literal } = require('sequelize')

const bcrypt = require('bcryptjs')
const sgMail = require('@sendgrid/mail')

const User = require("../models/user");

sgMail.setApiKey(process.env.SG_MAIL_KEY)


exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: req.flash('key')
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({ where: { email: email } })
        .then(user => {
            if (!user) {
                req.flash('key', 'Invalid email or password.');
                return res.redirect('/login')
            }
            bcrypt.compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return res.redirect('/')
                    }
                    req.flash('key', 'Invalid email or password.');
                    res.redirect('/login')
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login')
                })

        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error)
        });
};

exports.getSignup = (req, res, next) => {
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: req.flash('key')
    })
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    User.findOne({ where: { email: email } })
        .then(userDoc => {
            if (userDoc) {
                req.flash('key', 'E-Mail already exists, please pick a different one');
                return res.redirect('/signup')
            }
            return bcrypt
                .hash(password, 12)
                .then(hasedPassword => {
                    return User.create({ email: email, password: hasedPassword })
                })
                .then(user => {
                    return user.createCart();
                })
                .then(() => {
                    res.redirect('/login')
                    return sgMail.send({
                        to: email,
                        from: {
                            name: 'Web Wiz',
                            email: 'likavarshanidze04@icloud.com'
                        },
                        subject: 'Signup Successfuly',
                        text: 'and easy to do anywhere',
                        html: '<h1>You Successfully signed up!</h1>'
                    })
                })
                .then(resp => {

                })
                .catch(err => {
                    console.log('errrrrrrr', err);
                })
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error)
        })
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/')
    });
};

exports.getReset = (req, res, next) => {
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: req.flash('error')
    });
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset')
        }
        const token = buffer.toString('hex')
        User.findOne({ where: { email: req.body.email } })
            .then(user => {
                if (!user) {
                    req.flash('error', 'No Account with that email found.')
                    res.redirect('/reset')
                    return
                }
                user.resetToken = token;
                user.resetTokenExpiration = new Date(Date.now() + 3600000)
                return user.save()
            })
            .then(result => {
                if (!result) {
                    return
                }
                console.log('token', token);
                res.redirect('/')
                sgMail.send({
                    to: req.body.email,
                    from: {
                        name: 'Web Wiz',
                        email: 'likavarshanidze04@icloud.com'
                    },
                    subject: 'ok',
                    text: 'and easy to do anywhere',
                    html: `
                        <p>You Requested a Password request</p>
                        <a href="http://localhost:3000/reset/${token}">Click this  link to set a new password</a>
                    `
                })
            })
            .catch(err => {
                const error = new Error(err)
                error.httpStatusCode = 500;
                return next(error)
            })
    });
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token
    User.findOne({ where: { resetToken: token, resetTokenExpiration: { [Op.gt]: literal('NOW()') } } })
        .then(user => {
            console.log(user);
            if (!user) {
                console.log('nouser');
            }
            res.render('auth/new-password', {
                path: '/reset',
                pageTitle: 'New Password',
                errorMessage: req.flash('error'),
                userId: user.id.toString(),
                passwordToken: token
            });
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error)
        })
}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password
    const userId = req.body.userId
    const passwordToken = req.body.passwordToken
    let resetUser;

    User.findOne({ where: { resetToken: passwordToken, resetTokenExpiration: { [Op.gt]: literal('NOW()') } }, id: userId })
        .then(user => {
            resetUser = user
            return bcrypt.hash(newPassword, 12)
        })
        .then(hashedPassword => {
            resetUser.password = hashedPassword
            resetUser.resetToken = null
            resetUser.resetTokenExpiration = undefined
            return resetUser.save()
        })
        .then(result => {
            res.redirect('/login')
        })
        .catch(err => {
            const error = new Error(err)
            error.httpStatusCode = 500;
            return next(error)
        })
}