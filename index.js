'use strict'

const Fastify = require('fastify')
const User = require("./models/user")
const Slots = require('./models/slots')

function build(opts) {
    const fastify = Fastify(opts)

    fastify.register(require('fastify-jwt'), {secret: 'supersecret'})
    fastify.register(require('fastify-bcrypt'), {
        saltWorkFactor: 12
    })
    fastify.register(require('./auth'))
    fastify.register(require('fastify-cors'), {origin: true})
    fastify.after(routes)

    fastify.decorate('verifyJWTandLevelDB', verifyJWTandLevelDB)
    fastify.decorate('verifyUserAndPassword', verifyUserAndPassword)

    function verifyJWTandLevelDB(request, reply, done) {
        const jwt = this.jwt

        if (request.body && request.body.failureWithReply) {
            reply.code(401).send({error: 'Unauthorized'})
            return done(new Error())
        }

        if (!request.raw.headers.auth) {
            return done(new Error('Missing token header'))
        }

        jwt.verify(request.raw.headers.auth, onVerify)

        async function onVerify(err, decoded) {
            if (err || !decoded.username || !decoded.password) {
                return done(new Error('Token not valid'))
            }

            let user = await User.findOne({where: {username: decoded.username}});

            if (!user.password || user.password !== decoded.password) {
                return done(new Error('Token not valid'))
            }

            done()
        }
    }

    async function verifyUserAndPassword(request, reply, done) {
        const jwt = this.jwt
        if (!request.body || !request.body.username || !request.body.password) {
            return done(new Error('Missing user in request body'))
        }
        request.body.password = await fastify.bcrypt.hash(request.body.password);
        let user = await User.findOne({where: request.body});
        onUser(user);

        function onUser(user) {
            if (user === null) {
                return done(new Error('Password not valid'))
            }

            if (!user.password || user.password !== request.body.password) {
                return done(new Error('Password not valid'))
            }
            jwt.sign(request.body, onToken)

            function onToken(err, token) {
                if (err) return reply.send(err)
                request.log.info('User fetched')
                reply.send({
                    token: token,
                    user: user
                })
            }

            done()
        }
    }

    function routes() {
        fastify.route({
            method: 'POST',
            url: '/register',
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        username: {type: 'string'},
                        password: {type: 'string'}
                    },
                    required: ['username', 'password']
                }
            },
            handler: async (req, reply) => {
                req.log.info('Creating new user');
                let user = req.body;
                user.password = await fastify.bcrypt.hash(user.password);
                console.log(user.password)
                User.afterCreate(async (user, options) => onPut());
                let userCreated = await User.create(user, (err, user) => {
                    if (!err) {
                        app.jwt.sign(req.body, onToken)
                    } else {
                        reply.code(422).send({error: err})
                    }
                })

                function onPut() {
                    fastify.jwt.sign(req.body, onToken)
                }

                function onToken(err, token) {
                    if (err) return reply.send(err)
                    req.log.info('User created')
                    reply.send({
                        token: token,
                        user: userCreated
                    })
                }
            }
        })

        fastify.route({
            method: 'GET',
            url: '/no-auth',
            handler: (req, reply) => {
                req.log.info('Auth free route')
                reply.send({hello: 'world'})
            }
        })

        fastify.route({
            method: 'GET',
            url: '/user/:userid',
            handler: async (req, reply) => {
                let user = await User.findOne({where: {id: req.params.userid}});
                user.password = undefined;
                reply.send(user);
            }
        })

        fastify.route({
            method: 'GET',
            url: '/auth',
            preHandler: fastify.auth([fastify.verifyJWTandLevelDB]),
            handler: (req, reply) => {
                req.log.info('Auth route')
                reply.send({hello: 'world'})
            }
        })

        fastify.route({
            method: 'GET',
            url: '/timeslot/:user_id',
            handler: async (req, reply) => {
                req.log.info('Auth route')
                let slots = await Slots.findOne({where: {user_id: req.params.user_id}});
                reply.send(slots)
            }
        })

        fastify.route({
            method: 'POST',
            url: '/timeslot',
            preHandler: fastify.auth([fastify.verifyJWTandLevelDB]),
            handler: async (req, reply) => {
                req.log.info('Auth route')
                let user = await User.findOne({where: {username: fastify.jwt.decode(req.headers.auth).username}});
                const data = {
                    value: req.body.data,
                    user_id: user.id
                }
                const slots = await Slots.upsert(data);
                reply.send(slots)
            }
        })

        fastify.route({
            method: 'POST',
            url: '/auth-multiple',
            preHandler: fastify.auth([
                // Only one of these has to pass
                fastify.verifyJWTandLevelDB,
                fastify.verifyUserAndPassword
            ]),
            handler: (req, reply) => {
                req.log.info('Auth route')
            }
        })
    }

    return fastify
}

if (require.main === module) {
    const fastify = build({
        logger: {
            level: 'info'
        }
    })
    fastify.listen(4000, err => {
        if (err) throw err
        console.log(`Server listening at http://localhost:${fastify.server.address().port}`)
    })
}

module.exports = build
