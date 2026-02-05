# Sqyros Viral Features Implementation Plan
## Project Context

**Product:** Sqyros - AV Setup & Maintenance Assistant  
**Company:** AVNova (trading name of Sonak Media Ltd, registered in UK)  
**App Domain:** sqyros.com (the Sqyros application)  
**Company Website:** avnova.ai (AVNova portfolio - hosts/markets all tech apps)  
**Existing Stack:** React 18 + Vite + Tailwind + Supabase + Stripe + Claude API

---

## Implementation Phases

### Phase 1: Shareable Guide URLs (Week 1)
*The foundation of viral growth - every guide becomes a shareable asset*

### Phase 2: SEO Landing Pages (Week 1-2)
*Organic traffic engine - rank for "how to connect X to Y"*

### Phase 3: Mobile PWA + Offline (Week 2)
*Job site usage - work without connectivity*

### Phase 4: Community & Contributions (Week 3)
*User-generated content + reputation system*

### Phase 5: Referral System (Week 3-4)
*Accelerate word-of-mouth growth*

---

## Phase 1: Shareable Guide URLs

### 1.1 Database Schema Updates

Add to your existing migration or create a new one:

```sql
-- supabase/migrations/002_shareable_guides.sql

-- Add public sharing fields to saved_guides table
ALTER TABLE saved_guides 
ADD COLUMN IF NOT EXISTS public_id VARCHAR(12) UNIQUE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by_username VARCHAR(50),
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP;

-- Create index for fast public guide lookups
CREATE INDEX IF NOT EXISTS idx_saved_guides_public_id ON saved_guides(public_id) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_saved_guides_public ON saved_guides(is_public, created_at DESC);

-- Function to generate short unique IDs
CREATE OR REPLACE FUNCTION generate_public_id()
RETURNS VARCHAR(12) AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result VARCHAR(12) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate public_id when guide is made public
CREATE OR REPLACE FUNCTION set_public_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = true AND NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_public_id
BEFORE INSERT OR UPDATE ON saved_guides
FOR EACH ROW EXECUTE FUNCTION set_public_id();

-- Public guide views table (analytics)
CREATE TABLE IF NOT EXISTS guide_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES saved_guides(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  viewer_ip VARCHAR(45),
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_guide_views_guide_id ON guide_views(guide_id, created_at DESC);
```

### 1.2 New Edge Function: Get Public Guide

```typescript
// functions/get-public-guide/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const publicId = url.searchParams.get("id");

    if (!publicId) {
      return new Response(
        JSON.stringify({ error: "Missing guide ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the guide
    const { data: guide, error } = await supabase
      .from("saved_guides")
      .select(`
        id,
        public_id,
        title,
        core_system,
        peripheral_device,
        connection_type,
        guide_content,
        created_by_username,
        verified_at,
        view_count,
        created_at
      `)
      .eq("public_id", publicId)
      .eq("is_public", true)
      .single();

    if (error || !guide) {
      return new Response(
        JSON.stringify({ error: "Guide not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment view count
    await supabase
      .from("saved_guides")
      .update({ 
        view_count: guide.view_count + 1,
        last_viewed_at: new Date().toISOString()
      })
      .eq("id", guide.id);

    // Log view for analytics
    const viewerIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip");
    const referrer = req.headers.get("referer");
    const userAgent = req.headers.get("user-agent");

    await supabase.from("guide_views").insert({
      guide_id: guide.id,
      viewer_ip: viewerIp,
      referrer: referrer,
      user_agent: userAgent,
    });

    return new Response(
      JSON.stringify({ guide }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 1.3 New Edge Function: Share Guide

```typescript
// functions/share-guide/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { guideId, makePublic } = await req.json();
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user owns this guide
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's username
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    const username = userData?.name || userData?.email?.split("@")[0] || "Anonymous";

    // Update guide visibility
    const { data: guide, error } = await supabase
      .from("saved_guides")
      .update({ 
        is_public: makePublic,
        created_by_username: username
      })
      .eq("id", guideId)
      .eq("user_id", user.id)
      .select("public_id")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: "Failed to update guide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment share count if making public
    if (makePublic) {
      await supabase
        .from("saved_guides")
        .update({ share_count: supabase.sql`share_count + 1` })
        .eq("id", guideId);
    }

    const shareUrl = `https://sqyros.com/guide/${guide.public_id}`;

    return new Response(
      JSON.stringify({ 
        success: true,
        publicId: guide.public_id,
        shareUrl: shareUrl
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 1.4 Frontend: Public Guide Page

```jsx
// src/pages/PublicGuidePage.jsx

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { GuideDisplay } from '../components/guide/GuideDisplay';
import { Button } from '../components/ui/button';
import { Share2, Copy, Check, ArrowRight } from 'lucide-react';

export function PublicGuidePage() {
  const { publicId } = useParams();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchGuide() {
      try {
        const { data, error } = await supabase.functions.invoke('get-public-guide', {
          body: null,
          headers: {},
        });
        
        // Use query params instead
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-guide?id=${publicId}`
        );
        
        const result = await response.json();
        
        if (result.error) {
          setError(result.error);
        } else {
          setGuide(result.guide);
        }
      } catch (err) {
        setError('Failed to load guide');
      } finally {
        setLoading(false);
      }
    }

    fetchGuide();
  }, [publicId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: guide.title,
        text: `Check out this AV integration guide: ${guide.title}`,
        url: window.location.href,
      });
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-cyan-400">Loading guide...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl text-white">Guide not found</h1>
        <p className="text-gray-400">This guide may have been removed or made private.</p>
        <Link to="/">
          <Button>
            Go to Sqyros <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center font-bold text-black">
              S
            </div>
            <span className="text-white font-semibold">Sqyros</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-2">{copied ? 'Copied!' : 'Copy Link'}</span>
            </Button>
            <Button size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Guide Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <GuideDisplay guide={guide} />
        
        {/* CTA Banner */}
        <div className="mt-12 p-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Need more AV integration guides?
          </h2>
          <p className="text-gray-400 mb-4">
            Sqyros generates custom setup guides for 50+ AV devices instantly.
          </p>
          <Link to="/signup">
            <Button size="lg">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Footer Attribution */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          <p>
            Generated with{' '}
            <Link to="/" className="text-cyan-400 hover:text-cyan-300">
              Sqyros
            </Link>
            {' '}by{' '}
            <a 
              href="https://avnova.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300"
            >
              AVNova
            </a>
          </p>
          <p className="mt-1 text-gray-600">
            AVNova is a trading name of Sonak Media Ltd, registered in the UK.
          </p>
          {guide.created_by_username && (
            <p className="mt-2">
              Guide created by <span className="text-gray-400">{guide.created_by_username}</span>
              {guide.verified_at && (
                <span className="ml-2 text-green-400">✓ Verified</span>
              )}
            </p>
          )}
          <p className="mt-1">
            {guide.view_count} views
          </p>
        </div>
      </main>
    </div>
  );
}
```

### 1.5 Frontend: Share Button Component

```jsx
// src/components/guide/ShareGuideButton.jsx

import { useState } from 'react';
import { supabase } from '../../api/supabase';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '../ui/dialog';
import { 
  Share2, 
  Copy, 
  Check, 
  Twitter, 
  Linkedin, 
  Mail,
  Globe,
  Lock
} from 'lucide-react';

export function ShareGuideButton({ guideId, isPublic, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleMakePublic = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-guide`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ guideId, makePublic: true }),
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setShareUrl(result.shareUrl);
        onUpdate?.({ isPublic: true, publicId: result.publicId });
      }
    } catch (error) {
      console.error('Failed to share guide:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = shareUrl ? {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this AV integration guide`)}&url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    email: `mailto:?subject=${encodeURIComponent('AV Integration Guide')}&body=${encodeURIComponent(`I thought you might find this useful: ${shareUrl}`)}`,
  } : null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Share Guide</DialogTitle>
            <DialogDescription className="text-gray-400">
              Share this guide with your team or make it public.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {!isPublic && !shareUrl ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg">
                  <Lock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">This guide is private</p>
                    <p className="text-sm text-gray-400">
                      Make it public to share with others. Public guides can be viewed by anyone with the link.
                    </p>
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleMakePublic}
                  disabled={loading}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  {loading ? 'Creating link...' : 'Make Public & Get Link'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl || `https://sqyros.com/guide/${guideId}`}
                    readOnly
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex justify-center gap-3">
                  <a 
                    href={shareLinks?.twitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Twitter className="h-5 w-5 text-gray-400" />
                  </a>
                  <a 
                    href={shareLinks?.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Linkedin className="h-5 w-5 text-gray-400" />
                  </a>
                  <a 
                    href={shareLinks?.email}
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Mail className="h-5 w-5 text-gray-400" />
                  </a>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Anyone with this link can view the guide
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 1.6 Update Routes

```jsx
// src/App.jsx - Add to your existing routes

import { PublicGuidePage } from './pages/PublicGuidePage';

// In your Routes component, add:
<Route path="/guide/:publicId" element={<PublicGuidePage />} />
```

---

## Phase 2: SEO Landing Pages

### 2.1 Pre-Generated Static Guide Pages

Create a script to generate static SEO pages for top device combinations:

```javascript
// scripts/generate-seo-pages.js

const POPULAR_COMBINATIONS = [
  { system: 'QSC Q-SYS', device: 'Shure MXA920', connection: 'Dante' },
  { system: 'QSC Q-SYS', device: 'Shure MXA710', connection: 'Dante' },
  { system: 'Crestron', device: 'Logitech Rally Bar', connection: 'USB' },
  { system: 'Biamp Tesira', device: 'Sennheiser TeamConnect Ceiling 2', connection: 'Dante' },
  { system: 'Zoom Rooms', device: 'Poly Studio X50', connection: 'USB' },
  { system: 'Microsoft Teams Rooms', device: 'Logitech Rally Bar', connection: 'USB' },
  { system: 'Crestron', device: 'Samsung QM Series', connection: 'RS-232' },
  { system: 'Extron', device: 'LG UM3D Series', connection: 'IP Control' },
  // Add 50+ more combinations
];

function generateSlug(system, device, connection) {
  return `${system}-${device}-${connection}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// This would be run as a build step or scheduled job
// to pre-generate SEO-optimized pages
```

### 2.2 SEO Page Component

```jsx
// src/pages/SEOGuidePage.jsx

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GuideDisplay } from '../components/guide/GuideDisplay';
import { Button } from '../components/ui/button';
import { ArrowRight, Lock } from 'lucide-react';

// Pre-generated guide data (could be fetched from Supabase or static JSON)
import { SEO_GUIDES } from '../data/seo-guides';

export function SEOGuidePage() {
  const { slug } = useParams();
  const guide = SEO_GUIDES[slug];

  if (!guide) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <h1 className="text-2xl text-white">Guide not found</h1>
        <Link to="/" className="mt-4">
          <Button>Go to Sqyros</Button>
        </Link>
      </div>
    );
  }

  // Schema markup for rich snippets
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": guide.title,
    "description": guide.description,
    "step": guide.steps.map((step, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": step.title,
      "text": step.content
    })),
    "tool": [
      { "@type": "HowToTool", "name": guide.system },
      { "@type": "HowToTool", "name": guide.device }
    ]
  };

  return (
    <>
      <Helmet>
        <title>{guide.title} | Sqyros by AVNova</title>
        <meta name="description" content={guide.description} />
        <meta name="keywords" content={`${guide.system}, ${guide.device}, ${guide.connection}, AV integration, setup guide`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={guide.title} />
        <meta property="og:description" content={guide.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://sqyros.com/guides/${slug}`} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={guide.title} />
        <meta name="twitter:description" content={guide.description} />
        
        {/* Schema markup */}
        <script type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <header className="border-b border-gray-800">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg flex items-center justify-center font-bold text-black">
                S
              </div>
              <span className="text-white font-semibold">Sqyros</span>
            </Link>
            
            <Link to="/signup">
              <Button size="sm">Sign Up Free</Button>
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumbs for SEO */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link to="/" className="hover:text-gray-300">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/guides" className="hover:text-gray-300">Guides</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-400">{guide.system}</span>
          </nav>

          <h1 className="text-3xl font-bold text-white mb-4">
            How to Connect {guide.device} to {guide.system}
          </h1>
          
          <p className="text-gray-400 mb-8">
            {guide.description}
          </p>

          {/* Show preview of guide */}
          <div className="relative">
            <GuideDisplay guide={guide} preview={true} />
            
            {/* Blur overlay for non-logged-in users */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent flex items-end justify-center pb-8">
              <div className="text-center">
                <Lock className="h-8 w-8 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">Sign up to see the complete guide</p>
                <Link to="/signup">
                  <Button size="lg">
                    Get Full Guide Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Related Guides */}
          <section className="mt-16">
            <h2 className="text-xl font-semibold text-white mb-4">Related Guides</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {guide.relatedGuides?.map((related) => (
                <Link 
                  key={related.slug}
                  to={`/guides/${related.slug}`}
                  className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-cyan-500/50 transition-colors"
                >
                  <h3 className="text-white font-medium">{related.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{related.connection}</p>
                </Link>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-16 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>© 2025 AVNova. All rights reserved.</p>
            <p className="mt-1">AVNova is a trading name of Sonak Media Ltd, registered in the UK.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
```

### 2.3 Sitemap Generation

```javascript
// scripts/generate-sitemap.js

const fs = require('fs');
const { SEO_GUIDES } = require('../src/data/seo-guides');

const BASE_URL = 'https://sqyros.com';

function generateSitemap() {
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/guides', priority: 0.9, changefreq: 'daily' },
    { url: '/pricing', priority: 0.8, changefreq: 'weekly' },
    { url: '/about', priority: 0.5, changefreq: 'monthly' },
  ];

  const guidePages = Object.keys(SEO_GUIDES).map(slug => ({
    url: `/guides/${slug}`,
    priority: 0.8,
    changefreq: 'weekly',
  }));

  const allPages = [...staticPages, ...guidePages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync('public/sitemap.xml', sitemap);
  console.log(`Generated sitemap with ${allPages.length} URLs`);
}

generateSitemap();
```

---

## Phase 3: Mobile PWA + Offline

### 3.1 PWA Configuration

```javascript
// vite.config.js - Update with PWA plugin

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Sqyros - AV Setup Assistant',
        short_name: 'Sqyros',
        description: 'AI-powered AV integration guides and maintenance assistant',
        theme_color: '#00d4ff',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/sqyros\.avnova\.ai\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          }
        ]
      }
    })
  ]
});
```

### 3.2 Offline Guide Storage Hook

```jsx
// src/hooks/useOfflineGuides.js

import { useState, useEffect } from 'react';
import { openDB } from 'idb';

const DB_NAME = 'sqyros-offline';
const STORE_NAME = 'guides';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export function useOfflineGuides() {
  const [offlineGuides, setOfflineGuides] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadOfflineGuides();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineGuides = async () => {
    try {
      const db = await getDB();
      const guides = await db.getAll(STORE_NAME);
      setOfflineGuides(guides);
    } catch (error) {
      console.error('Failed to load offline guides:', error);
    }
  };

  const saveForOffline = async (guide) => {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, {
        ...guide,
        savedAt: new Date().toISOString(),
      });
      await loadOfflineGuides();
      return true;
    } catch (error) {
      console.error('Failed to save guide offline:', error);
      return false;
    }
  };

  const removeOfflineGuide = async (guideId) => {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, guideId);
      await loadOfflineGuides();
      return true;
    } catch (error) {
      console.error('Failed to remove offline guide:', error);
      return false;
    }
  };

  const getOfflineGuide = async (guideId) => {
    try {
      const db = await getDB();
      return await db.get(STORE_NAME, guideId);
    } catch (error) {
      console.error('Failed to get offline guide:', error);
      return null;
    }
  };

  return {
    offlineGuides,
    isOnline,
    saveForOffline,
    removeOfflineGuide,
    getOfflineGuide,
  };
}
```

### 3.3 Save for Offline Button

```jsx
// src/components/guide/SaveOfflineButton.jsx

import { useState } from 'react';
import { useOfflineGuides } from '../../hooks/useOfflineGuides';
import { Button } from '../ui/button';
import { Download, Check, Wifi, WifiOff } from 'lucide-react';

export function SaveOfflineButton({ guide }) {
  const { offlineGuides, saveForOffline, removeOfflineGuide, isOnline } = useOfflineGuides();
  const [saving, setSaving] = useState(false);
  
  const isSaved = offlineGuides.some(g => g.id === guide.id);

  const handleToggle = async () => {
    setSaving(true);
    if (isSaved) {
      await removeOfflineGuide(guide.id);
    } else {
      await saveForOffline(guide);
    }
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleToggle}
        disabled={saving}
      >
        {isSaved ? (
          <>
            <Check className="h-4 w-4 mr-2 text-green-400" />
            Saved Offline
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Offline'}
          </>
        )}
      </Button>
      
      {!isOnline && (
        <span className="flex items-center text-xs text-yellow-500">
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </span>
      )}
    </div>
  );
}
```

---

## Phase 4: Community & Contributions

### 4.1 Database Schema for Community

```sql
-- supabase/migrations/003_community.sql

-- User profiles for community
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(30) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  company VARCHAR(100),
  job_title VARCHAR(100),
  certifications TEXT[], -- ['CTS', 'CTS-D', 'CTS-I', 'Dante Level 3']
  specialties TEXT[], -- ['Dante', 'Crestron', 'QSC']
  website_url TEXT,
  linkedin_url TEXT,
  guides_count INTEGER DEFAULT 0,
  verified_guides_count INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  is_verified_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Badges system
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  category VARCHAR(50), -- 'contribution', 'expertise', 'milestone', 'special'
  requirements JSONB, -- { "guides_count": 10 } or { "specialty": "Dante", "guides_count": 5 }
  created_at TIMESTAMP DEFAULT NOW()
);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Guide ratings/feedback
CREATE TABLE IF NOT EXISTS guide_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES saved_guides(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  is_accurate BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(guide_id, user_id)
);

-- Guide verifications (by experienced users)
CREATE TABLE IF NOT EXISTS guide_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES saved_guides(id) ON DELETE CASCADE,
  verifier_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'needs_update', 'rejected'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(guide_id, verifier_id)
);

-- Insert default badges
INSERT INTO badges (slug, name, description, category, requirements) VALUES
('first-guide', 'First Guide', 'Created your first guide', 'milestone', '{"guides_count": 1}'),
('guide-10', 'Guide Creator', 'Created 10 guides', 'milestone', '{"guides_count": 10}'),
('guide-50', 'Prolific Author', 'Created 50 guides', 'milestone', '{"guides_count": 50}'),
('guide-100', 'Century Club', 'Created 100 guides', 'milestone', '{"guides_count": 100}'),
('dante-expert', 'Dante Expert', 'Created 10+ Dante guides', 'expertise', '{"specialty": "Dante", "guides_count": 10}'),
('crestron-pro', 'Crestron Pro', 'Created 10+ Crestron guides', 'expertise', '{"specialty": "Crestron", "guides_count": 10}'),
('qsc-wizard', 'Q-SYS Wizard', 'Created 10+ Q-SYS guides', 'expertise', '{"specialty": "QSC", "guides_count": 10}'),
('verifier', 'Verifier', 'Verified 10 community guides', 'contribution', '{"verifications_count": 10}'),
('founding-member', 'Founding Member', 'Joined during beta', 'special', '{"beta_user": true}'),
('verified-pro', 'Verified Pro', 'AVIXA CTS certified professional', 'special', '{"cts_certified": true}');

-- Leaderboard view
CREATE OR REPLACE VIEW community_leaderboard AS
SELECT 
  up.id,
  up.username,
  up.display_name,
  up.avatar_url,
  up.guides_count,
  up.verified_guides_count,
  up.reputation_score,
  up.is_verified_pro,
  up.certifications,
  up.specialties,
  (
    SELECT array_agg(b.slug)
    FROM user_badges ub
    JOIN badges b ON b.id = ub.badge_id
    WHERE ub.user_id = up.id
  ) as badges
FROM user_profiles up
ORDER BY up.reputation_score DESC, up.verified_guides_count DESC;

-- Function to update reputation score
CREATE OR REPLACE FUNCTION update_reputation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET 
    guides_count = (
      SELECT COUNT(*) FROM saved_guides WHERE user_id = NEW.user_id AND is_public = true
    ),
    verified_guides_count = (
      SELECT COUNT(*) FROM saved_guides sg
      JOIN guide_verifications gv ON sg.id = gv.guide_id
      WHERE sg.user_id = NEW.user_id AND gv.status = 'verified'
    ),
    reputation_score = (
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN is_public THEN 10
            ELSE 0
          END
        ), 0) +
        COALESCE((
          SELECT COUNT(*) * 25 FROM guide_verifications gv
          JOIN saved_guides sg ON sg.id = gv.guide_id
          WHERE sg.user_id = NEW.user_id AND gv.status = 'verified'
        ), 0) +
        COALESCE((
          SELECT SUM(gr.rating) * 2 FROM guide_ratings gr
          JOIN saved_guides sg ON sg.id = gr.guide_id
          WHERE sg.user_id = NEW.user_id
        ), 0)
      FROM saved_guides WHERE user_id = NEW.user_id
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Community Leaderboard Component

```jsx
// src/components/community/Leaderboard.jsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../api/supabase';
import { Trophy, Medal, Award, CheckCircle, Star } from 'lucide-react';

const BADGE_ICONS = {
  'dante-expert': '🎵',
  'crestron-pro': '🔧',
  'qsc-wizard': '🎛️',
  'verifier': '✅',
  'founding-member': '⭐',
  'verified-pro': '🏆',
  'guide-10': '📝',
  'guide-50': '📚',
  'guide-100': '🏅',
};

export function Leaderboard({ limit = 10 }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from('community_leaderboard')
        .select('*')
        .limit(limit);

      if (!error && data) {
        setLeaders(data);
      }
      setLoading(false);
    }

    fetchLeaderboard();
  }, [limit]);

  if (loading) {
    return <div className="animate-pulse">Loading leaderboard...</div>;
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h2 className="text-lg font-semibold text-white">Top Contributors</h2>
      </div>

      <div className="space-y-3">
        {leaders.map((user, index) => (
          <Link
            key={user.id}
            to={`/community/${user.username}`}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            {/* Rank */}
            <div className="w-8 text-center">
              {index === 0 && <Medal className="h-6 w-6 text-yellow-500 mx-auto" />}
              {index === 1 && <Medal className="h-6 w-6 text-gray-400 mx-auto" />}
              {index === 2 && <Medal className="h-6 w-6 text-amber-600 mx-auto" />}
              {index > 2 && <span className="text-gray-500">{index + 1}</span>}
            </div>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.username[0].toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium truncate">
                  {user.display_name || user.username}
                </span>
                {user.is_verified_pro && (
                  <CheckCircle className="h-4 w-4 text-cyan-400" />
                )}
              </div>
              <div className="text-sm text-gray-500">
                {user.verified_guides_count} verified guides
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-1">
              {user.badges?.slice(0, 3).map(badge => (
                <span key={badge} title={badge} className="text-lg">
                  {BADGE_ICONS[badge] || '🏷️'}
                </span>
              ))}
            </div>

            {/* Score */}
            <div className="text-right">
              <div className="text-cyan-400 font-semibold">{user.reputation_score}</div>
              <div className="text-xs text-gray-500">points</div>
            </div>
          </Link>
        ))}
      </div>

      <Link 
        to="/community"
        className="block mt-4 text-center text-sm text-cyan-400 hover:text-cyan-300"
      >
        View full leaderboard →
      </Link>
    </div>
  );
}
```

---

## Phase 5: Referral System

### 5.1 Database Schema for Referrals

```sql
-- supabase/migrations/004_referrals.sql

-- Referral codes
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(12) UNIQUE NOT NULL,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER, -- NULL for unlimited
  reward_type VARCHAR(50) DEFAULT 'pro_days', -- 'pro_days', 'credits'
  reward_amount INTEGER DEFAULT 30, -- 30 days of Pro
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(12) REFERENCES referral_codes(code),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'rewarded'
  referrer_rewarded BOOLEAN DEFAULT false,
  referred_rewarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(referred_id) -- Each user can only be referred once
);

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(12) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding confusing chars
  result VARCHAR(12) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create referral code for new users
CREATE OR REPLACE FUNCTION create_user_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, generate_referral_code());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_referral_code
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION create_user_referral_code();

-- Process referral rewards
CREATE OR REPLACE FUNCTION process_referral_reward()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    -- Get referral code details
    DECLARE
      rc referral_codes%ROWTYPE;
    BEGIN
      SELECT * INTO rc FROM referral_codes WHERE code = NEW.referral_code;
      
      IF rc.reward_type = 'pro_days' THEN
        -- Add pro days to both users
        UPDATE users 
        SET pro_expires_at = GREATEST(
          COALESCE(pro_expires_at, NOW()),
          NOW()
        ) + (rc.reward_amount || ' days')::INTERVAL
        WHERE id IN (NEW.referrer_id, NEW.referred_id);
        
        NEW.referrer_rewarded := true;
        NEW.referred_rewarded := true;
      END IF;
      
      -- Increment uses count
      UPDATE referral_codes 
      SET uses_count = uses_count + 1 
      WHERE code = NEW.referral_code;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_referral
BEFORE UPDATE ON referrals
FOR EACH ROW EXECUTE FUNCTION process_referral_reward();
```

### 5.2 Referral Component

```jsx
// src/components/referral/ReferralCard.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../lib/AuthContext';
import { Button } from '../ui/button';
import { Copy, Check, Gift, Users, Share2 } from 'lucide-react';

export function ReferralCard() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState(null);
  const [referralStats, setReferralStats] = useState({ count: 0, pending: 0 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    // Get user's referral code
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('code, uses_count')
      .eq('user_id', user.id)
      .single();

    if (codeData) {
      setReferralCode(codeData.code);
    }

    // Get referral stats
    const { data: statsData } = await supabase
      .from('referrals')
      .select('status')
      .eq('referrer_id', user.id);

    if (statsData) {
      setReferralStats({
        count: statsData.filter(r => r.status === 'completed').length,
        pending: statsData.filter(r => r.status === 'pending').length,
      });
    }

    setLoading(false);
  };

  const referralUrl = referralCode 
    ? `https://sqyros.com/signup?ref=${referralCode}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join Sqyros',
        text: 'Get AI-powered AV integration guides. Use my referral link for 30 days free Pro access!',
        url: referralUrl,
      });
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-gray-800 rounded-xl" />;
  }

  return (
    <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-cyan-500/20 rounded-lg">
          <Gift className="h-6 w-6 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Invite Colleagues</h3>
          <p className="text-sm text-gray-400">Get 30 days Pro for each referral</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-cyan-400">{referralStats.count}</div>
          <div className="text-xs text-gray-500">Successful Referrals</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{referralStats.count * 30}</div>
          <div className="text-xs text-gray-500">Pro Days Earned</div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="space-y-3">
        <label className="text-sm text-gray-400">Your referral link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={referralUrl}
            readOnly
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        
        <Button className="w-full" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share with Colleagues
        </Button>
      </div>

      {/* How it works */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-400">How it works:</strong> When someone signs up using your link and generates their first guide, you both get 30 days of Pro access free.
        </p>
      </div>
    </div>
  );
}
```

---

## Deployment Checklist

### Environment Variables (Vercel/Production)

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App
VITE_APP_URL=https://sqyros.com
VITE_APP_NAME=Sqyros

# Analytics (optional)
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_MIXPANEL_TOKEN=your-token
```

### Supabase Secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID_PRO_MONTHLY=price_...
supabase secrets set APP_URL=https://sqyros.com
```

### Deploy Commands

```bash
# Deploy all edge functions
supabase functions deploy get-public-guide
supabase functions deploy share-guide
supabase functions deploy claude-router
supabase functions deploy generate-guide
supabase functions deploy chat
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook

# Run database migrations
supabase db push

# Build and deploy frontend
npm run build
vercel --prod
```

---

## Implementation Priority

### Week 1 (Critical for Growth)
1. ✅ Shareable guide URLs (public_id, share buttons)
2. ✅ Public guide page with CTA
3. ✅ SEO meta tags + schema markup

### Week 2 (Organic Traffic)
4. ✅ Pre-generated SEO landing pages
5. ✅ Sitemap generation
6. ✅ PWA configuration

### Week 3 (Engagement + Retention)
7. ✅ Community profiles
8. ✅ Leaderboard
9. ✅ Badges system

### Week 4 (Viral Acceleration)
10. ✅ Referral system
11. ✅ Offline guide storage
12. ✅ Analytics dashboard

---

## Success Metrics

| Metric | Week 1 | Month 1 | Month 3 |
|--------|--------|---------|---------|
| Signups | 100 | 500 | 5,000 |
| Public Guides | 50 | 500 | 5,000 |
| Guide Views | 500 | 5,000 | 50,000 |
| Share Rate | 5% | 15% | 25% |
| Referral Signups | 10 | 100 | 1,000 |
| Organic Traffic | 100 | 2,000 | 20,000 |
| MRR | $100 | $500 | $5,000 |

---

## Legal Footer

All public pages should include:

```
© 2025 Sqyros. All rights reserved.
Sqyros is a product of AVNova.
AVNova is a trading name of Sonak Media Ltd, registered in England and Wales.
```

---

## Next Steps

1. Copy this plan to your project as `IMPLEMENTATION.md`
2. Start with Phase 1 (shareable URLs) - highest impact
3. Use VS Code + Claude to implement each component
4. Test locally before deploying to production
5. Monitor analytics and iterate

Questions? The implementation is modular - you can tackle phases independently or in parallel.
