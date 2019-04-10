import React from "react"

import Layout from "../components/layout"
import SEO from "../components/seo"

const IndexPage = () => (
  <Layout>
    <SEO title="Home" keywords={[`ajcatarina`, `aj catarina`, `AJ Catarina`, `Ariel Jay Catarina`, `Ariel Catarina`]} />
    <h1>Hi, I'm AJ.</h1>
    <p>
      I'm a software engineer at Gortek. As you can see, there's nothing in here.
      I'm still trying to come up with a creative way to share about my work on this site.
    </p>
    <p>This will become pretty, I promise. 😊</p>
    <p>Have a good day!</p>
  </Layout>
)

export default IndexPage
