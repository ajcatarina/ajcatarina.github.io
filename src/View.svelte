<style>
  main {
    max-height: 100vh;
    max-width: 100vw;
    overflow: hidden;
    position: relative;
  }
</style>

<script>
  import work from './data/work.yml'
  import about from './data/about.yml'

  console.log(about)
	let currentMainView = 1
	let subViewOpen = false 

  function goTo(view) {
    currentMainView = view
  }

  function toggleSubview(view) {
    subViewOpen = !subViewOpen
  }
</script>

<main>
  <div id="main-container" class:hidden-left={subViewOpen}>
    <div id="main-nav">
      <div class="l-pad">
        <h5
          class="nav"
          class:nav-active={currentMainView === 1}
          on:click={() => goTo(1)}
        >
          ABOUT
        </h5>
        <h5
          class="nav"
          class:nav-active={currentMainView === 2}
          on:click={() => goTo(2)}
        >
          WORK
        </h5>
        <h5
          class="nav"
          class:nav-active={currentMainView === 3}
          on:click={() => goTo(3)}
        >
          CONTACT
        </h5>
      </div>
    </div>
    <div id="main-views" class="w-full">
      <div class="main-view flex w-full" class:hidden-above={currentMainView > 1}>
        <div class="v-center" style="flex: 1;">
          <h1>AJ CATARINA</h1>
          <h2>Software Engineer</h2>
        </div>
        <div class="v-center" style="margin-right: 80px;">
          <h5 class="nav" on:click={toggleSubview}>></h5>
        </div>
      </div>
      <div
        class="main-view"
        class:hidden-above={currentMainView > 2}
        class:hidden-below={currentMainView < 2}
      >
        <div class="scroll-view">
          {#each work.summary as work}
            <div>
              <h2>{work.company.toUpperCase()}</h2>
              <p>{work.description}</p>
              <div class="projects-container">
                {#each work.projects as project}
                  <div class="project-item">
                    <div class="project">
                      <h5 style="margin: 0;">{project.name.toUpperCase()}</h5>
                      <p style="font-size: 12px;">{project.role}</p>
                      {#each project.tech as tech}
                        <span style="font-size: 12px;">&middot;{tech}&nbsp;</span>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
      <div
        class="main-view flex w-full"
        class:hidden-above={currentMainView > 3}
        class:hidden-below={currentMainView < 3}
      >
        <div class="v-center" style="flex: 1;">
          <p>ajcatarina@outlook.com</p>
          <p>https://www.linkedin.com/in/ajcatarina/</p>
        </div>
      </div>
    </div>
  </div>
  <div
    class="sub-view flex w-full"
    class:hidden-right={!subViewOpen || currentMainView !== 1}
  >
    <div class="v-center" style="margin-left: 80px; min-width: 160px;">
      <h5 class="nav" on:click={toggleSubview}>{'<'}</h5>
    </div>
    <div class="scroll-view">
      <div class="sub-view-content flex w-full">
        <div style="flex: 1;">
          <h2>BIO</h2>
          {#each about.bio.split(/\\n/g) as para}
            <p>{para}</p>
          {/each}
        </div>
        <div style="flex: 1; margin-left: 40px">
          <h4>SKILL SET</h4>
          <ul>
            {#each about.skill_set as skill}
              <li>{skill}</li>
            {/each}
          </ul>
          <h4>LIBRARIES &amp; FRAMEWORKS</h4>
          <ul>
            {#each about.libraries_frameworks as lib}
              <li>{lib}</li>
            {/each}
          </ul>
          <h4>TOOLS</h4>
          <ul>
            {#each about.tools as tool}
              <li>{tool}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </div>
</main>

