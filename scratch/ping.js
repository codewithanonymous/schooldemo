// use native fetch

async function ping() {
  const url = 'https://rgcevwcnzptwmxmqindg.supabase.co'
  console.log(`Fetching ${url}...`)
  try {
    const res = await fetch(url)
    console.log(`Status: ${res.status} ${res.statusText}`)
  } catch (err) {
    console.error(`Fetch failed:`, err)
  }
}

ping()
