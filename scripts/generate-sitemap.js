import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment')
  console.log('Run: source .env or export the variables first')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateSitemap() {
  const { data: guides, error } = await supabase
    .from('saved_guides')
    .select('public_id, slug, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching guides:', error.message)
    process.exit(1)
  }

  const staticPages = [
    { url: 'https://sqyros.com/', priority: '1.0' },
    { url: 'https://sqyros.com/pricing', priority: '0.8' },
    { url: 'https://sqyros.com/community', priority: '0.7' },
    { url: 'https://sqyros.com/leaderboard', priority: '0.6' },
  ]

  const guidePages = (guides || []).map(g => ({
    url: g.slug ? 'https://sqyros.com/guides/' + g.slug : 'https://sqyros.com/guide/' + g.public_id,
    lastmod: g.created_at ? g.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    priority: '0.7'
  }))

  const urls = [...staticPages, ...guidePages]

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  for (const u of urls) {
    xml += '  <url>\n'
    xml += '    <loc>' + u.url + '</loc>\n'
    if (u.lastmod) xml += '    <lastmod>' + u.lastmod + '</lastmod>\n'
    xml += '    <priority>' + u.priority + '</priority>\n'
    xml += '  </url>\n'
  }
  xml += '</urlset>'

  writeFileSync('public/sitemap.xml', xml)
  console.log('SUCCESS: sitemap.xml generated with ' + urls.length + ' URLs (' + guidePages.length + ' guides)')
}

generateSitemap()
