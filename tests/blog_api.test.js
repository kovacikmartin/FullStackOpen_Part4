const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')

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
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

    const blogs = await api.get('/api/blogs')
    const titles = blogs.body.map(blog => blog.title)

    expect(blogs.body).toHaveLength(initialBlogs.length + 1)

    expect(titles).toContain(newBlog.title)

})

test('if likes property is missing, default is zero', async () => {

    const blogWithoutLikes = initialBlogs[0]
    delete blogWithoutLikes.likes
    
    const response = await api
        .post('/api/blogs')
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
        .send(blog)
        .expect(400)
})

describe('delete blog with', () => {

    test('existing id', async () => {

        const blogs = await Blog.find({})
        const blogToDelete = blogs[0]

        await api
            .delete(`/api/blogs/${blogToDelete.id}`)
            .expect(204)

        const response = await api.get('/api/blogs')
        const titles = response.body.map(response => response.title)

        expect(titles).not.toContain(blogToDelete.title)
        expect(response.body).toHaveLength(initialBlogs.length - 1)
    })

    test('non-existing id', async () => {

        await api
            .delete('/api/blogs/61f1a780d418xx0000x0000x')
            .expect(400)
    })

    test('invalid id', async () => {

        await api
            .delete('/api/blogs/no-such-id')
            .expect(400)
    })
})

test('blog update', async () => {

    const blogs = await Blog.find({})
    const updatedBlog = blogs[0]

    updatedBlog.likes = 100

    await api
        .put(`/api/blogs/${updatedBlog.id}`)
        .send(updatedBlog)
        .expect(200)

    const response = await api.get('/api/blogs')
    expect(response.body[0].likes).toBe(100)
})

afterAll(() => {
    mongoose.connection.close()
})