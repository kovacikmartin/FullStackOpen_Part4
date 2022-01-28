const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const bcrypt = require('bcrypt')
const helper = require('./test_helper')

const Blog = require('../models/blog')
const User = require('../models/user')

var token = ''

const initialBlogs = [
    {
       
        title: 'React patterns',
        author: 'Michael Chan',
        url: 'https://reactpatterns.com/',
        likes: 7
        
    },
    {
        
        title: 'Go To Statement Considered Harmful',
        author: 'Edsger W. Dijkstra',
        url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
        likes: 5
        
    },
    {
        
        title: 'Canonical string reduction',
        author: 'Edsger W. Dijkstra',
        url: 'http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html',
        likes: 12
        
    }
]

beforeEach(async () => {

    await Blog.deleteMany({})

    const blogObjects = initialBlogs.map(blog => new Blog(blog))
    const promiseArray = blogObjects.map(blog => blog.save())

    await Promise.all(promiseArray)

    await User.deleteMany({})
    
    const passwordHash = await bcrypt.hash('super duper secret password', 10)

    const initUser = new User({

        username: 'root',
        name: 'Garry Root',
        passwordHash
    })

    await initUser.save()

    const loggedUser = {

        username: 'root',
        name: 'Garry Root',
        password: 'super duper secret password'
    }

    const response = await api
        .post('/api/login')
        .send(loggedUser)

    token = response.body.token
})

test('get all blogs', async () => {

    const response = await api.get('/api/blogs')

    expect(response.body).toHaveLength(initialBlogs.length)
})

test('blogs have id instead of _id', async () => {

    const response = await api.get('/api/blogs')

    expect(response.body[0].id).toBeDefined()
})

test('insert new blog to db', async () => {

    const newBlog = {

        title: 'Type wars',
        author: 'Robert C. Martin',
        url: 'http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html',
        likes: 2
    }

    await api
        .post('/api/blogs')
        .set('Authorization', `bearer ${token}`)
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

    const blogs = await api.get('/api/blogs')
    const titles = blogs.body.map(blog => blog.title)

    expect(blogs.body).toHaveLength(initialBlogs.length + 1)

    expect(titles).toContain(newBlog.title)
})

test('inserting new blog without token fails with 401', async () => {

    await api
        .post('/api/blogs')
        .send(initialBlogs[0])
        .expect(401)
})

test('if likes property is missing, default is zero', async () => {

    const blogWithoutLikes = initialBlogs[0]
    delete blogWithoutLikes.likes

    const response = await api
        .post('/api/blogs')
        .set('Authorization', `bearer ${token}`)
        .send(blogWithoutLikes)
        .expect(201)
        .expect('Content-Type', /application\/json/)

    expect(response.body.likes).toBe(0)
})

test('title and url missing results in 400 Bad Request', async () => {

    const blog = {

        author: initialBlogs[1].author,
        likes: initialBlogs[1].likes
    }

    await api
        .post('/api/blogs')
        .set('Authorization', `bearer ${token}`)
        .send(blog)
        .expect(400)
})

describe('delete blog with', () => {

    test('existing id and correct user passes', async () => {

        const newBlog = {

            title: 'Title',
            author: 'Author',
            url: 'https://url.com/',
            likes: 45
        }
        
        await api
            .post('/api/blogs')
            .set('Authorization', `bearer ${token}`)
            .send(newBlog)

        const blogs = await Blog.find({})
        const blogToDelete = blogs[initialBlogs.length]

        await api
            .delete(`/api/blogs/${blogToDelete.id}`)
            .set('Authorization', `bearer ${token}`)
            .expect(204)

        const response = await api.get('/api/blogs')
        const titles = response.body.map(response => response.title)

        expect(titles).not.toContain(blogToDelete.title)
        expect(response.body).toHaveLength(initialBlogs.length)
    })

    test('existing id and incorrect user does not pass', async () => {

        const newBlog = {

            title: 'Title',
            author: 'Author',
            url: 'https://url.com/',
            likes: 45
        }

        const passwordHash = await bcrypt.hash('test password', 10)

        const newUser = new User({

            username: 'testUser',
            passwordHash
        })

        await newUser.save()

        const incorrectUser = {

            username: 'testUser',
            password: 'test password'
        }
    
        const responseIncorrectUser = await api
            .post('/api/login')
            .send(incorrectUser)
    
        const incorrectToken = responseIncorrectUser.body.token
        
        await api
            .post('/api/blogs')
            .set('Authorization', `bearer ${token}`)
            .send(newBlog)

        const blogs = await Blog.find({})
        const blogToDelete = blogs[initialBlogs.length]

        await api
            .delete(`/api/blogs/${blogToDelete.id}`)
            .set('Authorization', `bearer ${incorrectToken}`)
            .expect(401)

        const response = await api.get('/api/blogs')
        const titles = response.body.map(response => response.title)

        expect(titles).toContain(blogToDelete.title)
        expect(response.body).toHaveLength(initialBlogs.length+1)
    })

    test('non-existing id', async () => {

        await api
            .delete('/api/blogs/61f1a780d418xx0000x0000x')
            .set('Authorization', `bearer ${token}`)
            .expect(400)
    })

    test('invalid id', async () => {

        await api
            .delete('/api/blogs/no-such-id')
            .set('Authorization', `bearer ${token}`)
            .expect(400)
    })
})

test('blog update', async () => {

    const blogs = await Blog.find({})
    const updatedBlog = blogs[0]

    updatedBlog.likes = 100

    await api
        .put(`/api/blogs/${updatedBlog.id}`)
        .set('Authorization', `bearer ${token}`)
        .send(updatedBlog)
        .expect(200)

    const response = await api.get('/api/blogs')
    expect(response.body[0].likes).toBe(100)
})

describe('when there is initially one user in db', () => {

    beforeEach(async () => {
        await User.deleteMany({})
    
        const passwordHash = await bcrypt.hash('super duper secret password', 10)
        const user = new User({ username: 'root', passwordHash })
    
        await user.save()
    })
  
    test('creation succeeds with a fresh username', async () => {

        const usersAtStart = await helper.usersInDb()
    
        const newUser = {
            username: 'Florida Man',
            name: 'Joe Kerr',
            password: 'fearless',
        }
  
        await api
            .post('/api/users')
            .send(newUser)
            .expect(200)
            .expect('Content-Type', /application\/json/)
    
        const usersAtEnd = await helper.usersInDb()
        expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)
    
        const usernames = usersAtEnd.map(u => u.username)
        expect(usernames).toContain(newUser.username)
    })
})

describe('creating invalid user (returns proper http status code and error message) with', () => {
    
    test('non-unique username', async () => {

        const usersAtStart = await helper.usersInDb()
    
        const newUser = {
            username: 'root',
            name: 'Garry Root',
            password: 'twig',
        }

        const response = await api
            .post('/api/users')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        expect(response.body.error).toContain('`username` to be unique')

        const usersAtEnd = await helper.usersInDb()

        expect(usersAtEnd.length).toBe(usersAtStart.length)
    })

    test('short username', async () => {

        const usersAtStart = await helper.usersInDb()
    
        const newUser = {
            username: 'gr',
            name: 'Garry Root',
            password: 'twig',
        }

        const response = await api
            .post('/api/users')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        expect(response.body.error).toContain('Username too short')

        const usersAtEnd = await helper.usersInDb()

        expect(usersAtEnd.length).toBe(usersAtStart.length)
    })

    test('short password', async () => {

        const usersAtStart = await helper.usersInDb()
    
        const newUser = {
            username: 'root',
            name: 'Garry Root',
            password: 'gr',
        }

        const response = await api
            .post('/api/users')
            .send(newUser)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        expect(response.body.error).toContain('Password too short')

        const usersAtEnd = await helper.usersInDb()

        expect(usersAtEnd.length).toBe(usersAtStart.length)
    })
})

afterAll(() => {
    mongoose.connection.close()
})