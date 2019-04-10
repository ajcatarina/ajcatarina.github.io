module.exports = {
  siteMetadata: {
    title: `AJ Catarina`,
    description: `AJ. AJ (Ariel Jay) Catarina is a licensed Electronics Engineer 
    who fell in love with web and mobile development. Instead of pursuing a career
    in electronics design and manufacturing, he dedicated himself in learning more
    about coding. This passion began when he knew about React. He was amazed about the
    enthusiasm of developers for this revolutionary technology. Eventually, as his
    knowledge grew, he got hit by the same arrow.`,
    author: `AJ Catarina`,
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `portfolio`,
        short_name: `portfolio`,
        start_url: `/`,
        background_color: `#663399`,
        theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `src/images/logo.png`, // This path is relative to the root of the site.
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // 'gatsby-plugin-offline',
  ],
}
