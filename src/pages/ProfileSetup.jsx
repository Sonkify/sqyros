import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { updateUserProfile } from '@/api/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Briefcase, Award, Link, X, Check, Loader2 } from 'lucide-react'

const CERTIFICATIONS = [
  'CTS', 'CTS-D', 'CTS-I',
  'Dante Level 1', 'Dante Level 2', 'Dante Level 3',
  'Crestron Certified', 'QSC Level 1', 'QSC Level 2',
  'Extron Certified', 'AMX Certified', 'Biamp Certified',
  'Shure Certified', 'Sennheiser Certified'
]

const SPECIALTIES = [
  'Dante', 'AES67', 'Crestron', 'QSC Q-SYS', 'Extron',
  'AMX', 'Biamp', 'Shure', 'Video Conferencing',
  'Digital Signage', 'Control Systems', 'DSP Programming',
  'Network AV', 'Live Events', 'Corporate AV', 'Education'
]

export default function ProfileSetup() {
  const { user, profile, supabaseClient, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState(null)
  
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    company: '',
    job_title: '',
    website_url: '',
    linkedin_url: '',
    certifications: [],
    specialties: []
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        bio: profile.bio || '',
        company: profile.company || '',
        job_title: profile.job_title || '',
        website_url: profile.website_url || '',
        linkedin_url: profile.linkedin_url || '',
        certifications: profile.certifications || [],
        specialties: profile.specialties || []
      })
    }
  }, [profile])

  const checkUsername = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      return
    }
    if (username === profile?.username) {
      setUsernameAvailable(true)
      return
    }
    setCheckingUsername(true)
    try {
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle()
      setUsernameAvailable(!data)
    } catch (error) {
      console.error('Error checking username:', error)
    } finally {
      setCheckingUsername(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      checkUsername(formData.username)
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.username])

  const toggleCertification = (cert) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }))
  }

  const toggleSpecialty = (spec) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(spec)
        ? prev.specialties.filter(s => s !== spec)
        : [...prev.specialties, spec]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.username || formData.username.length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }
    if (!usernameAvailable && formData.username !== profile?.username) {
      toast.error('Username is not available')
      return
    }
    setSaving(true)
    try {
      await updateUserProfile(supabaseClient, user.id, {
        ...formData,
        username: formData.username.toLowerCase(),
        profile_completed: true
      })
      await refreshProfile()
      toast.success('Profile saved successfully')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-600 mt-2">
            Set up your profile to join the Sqyros community
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                    placeholder="avtech_pro"
                    className="pr-10"
                    maxLength={30}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                    {!checkingUsername && usernameAvailable === true && <Check className="w-4 h-4 text-green-500" />}
                    {!checkingUsername && usernameAvailable === false && <X className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Letters, numbers, and underscores only
                </p>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell the community about yourself..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Professional Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="AV Solutions Inc."
                  />
                </div>
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="AV Engineer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website_url">Website</Label>
                  <Input
                    id="website_url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://yoursite.com"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/you"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Certifications
              </CardTitle>
              <CardDescription>
                Select your AV certifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATIONS.map((cert) => (
                  <Badge
                    key={cert}
                    variant={formData.certifications.includes(cert) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleCertification(cert)}
                  >
                    {formData.certifications.includes(cert) && <Check className="w-3 h-3 mr-1" />}
                    {cert}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Specialties
              </CardTitle>
              <CardDescription>
                What technologies do you work with?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((spec) => (
                  <Badge
                    key={spec}
                    variant={formData.specialties.includes(spec) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleSpecialty(spec)}
                  >
                    {formData.specialties.includes(spec) && <Check className="w-3 h-3 mr-1" />}
                    {spec}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/dashboard')}
            >
              Skip for now
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
