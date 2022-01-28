/* eslint-disable no-unused-vars */
const dummy = (blogs) => {

    return 1
}
/* eslint-enable no-unused-vars */

const totalLikes = blogs => {

    return blogs.reduce((sum, blog) => sum + blog.likes, 0)
}

const favoriteBlog = blogs => {

    const mostLiked = blogs.reduce((previous, current) => previous.likes > current.likes ? previous : current, {})

    if(mostLiked === {}){

        return {}
    }

    const formattedMostLiked = {

        title: mostLiked.title,
        author: mostLiked.author,
        likes: mostLiked.likes
    }

    return formattedMostLiked
}

module.exports = { 
    dummy,
    totalLikes,
    favoriteBlog
}