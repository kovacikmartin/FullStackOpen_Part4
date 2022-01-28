const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const jwt = require('jsonwebtoken')

blogsRouter.get('/', async (request, response) => {

    const blogs = await Blog
        .find({})
        .populate('user', {username: 1, name: 1, id: 1})

    response.json(blogs)   
})

blogsRouter.post('/', async (request, response) => {

    if(!request.token){
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    const decodedToken = jwt.verify(request.token, process.env.SECRET)

    if (!decodedToken.id || !decodedToken) {
        return response.status(401).json({ error: 'token missing or invalid' })
    }

    const user = request.user
    const blog = new Blog(request.body)
    blog.user = user.id
    
    const savedBlog = await blog.save()
    user.blogs = user.blogs.concat(savedBlog.id)

    await user.save()
        
    response.status(201).json(savedBlog)
})

blogsRouter.delete('/:id', async (request, response) => {

    const decodedToken = jwt.verify(request.token, process.env.SECRET)
    const blog = await Blog.findById(request.params.id)

    if(!decodedToken.id){

        return response.status(401).json({error: 'token missing or invalid'})
    }

    if(blog.user.toString() !== decodedToken.id.toString()){

        return response.status(401).json({error: 'you do not have permission to delete this blog'})
    }

    await Blog.findByIdAndRemove(request.params.id)

    const user = request.user
    
    user.blogs = user.blogs.filter(blog => blog.toString() !== request.params.id)

    await user.save()

    response.status(204).end()
})

blogsRouter.put('/:id', async (request, response) => {

    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, request.body, {new: true, runValidators: true})

    response.json(updatedBlog)
})

module.exports = blogsRouter