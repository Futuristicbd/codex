// LinkedIn connector.
// Text posts are implemented via the UGC Posts API. Image/video posting on
// LinkedIn requires a multi-step asset registration + upload flow that is only
// available to approved apps, so media falls back to a manual note.
import { requestJson } from '../lib/http.js';

export default {
  id: 'linkedin',
  name: 'LinkedIn',
  icon: '💼',
  status: 'beta',
  summary: 'Share a text update to a LinkedIn profile or organization page.',
  supportsMedia: false,
  mediaNote: 'LinkedIn media upload needs an approved app — attach media manually for now.',
  docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api',
  fields: [
    {
      key: 'accessToken',
      label: 'Access token',
      type: 'password',
      placeholder: 'OAuth 2.0 access token',
      help: 'A token with w_member_social (profile) or w_organization_social (page) scope.',
    },
    {
      key: 'authorUrn',
      label: 'Author URN',
      type: 'text',
      placeholder: 'urn:li:person:xxxx or urn:li:organization:1234',
      help: 'The URN of the profile or organization that will author the post.',
    },
  ],

  async publish({ text, media, credentials }) {
    if ((media || []).length) {
      throw Object.assign(
        new Error('LinkedIn media posting is not automated — attach the media manually.'),
        { manual: true },
      );
    }
    const payload = JSON.stringify({
      author: credentials.authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    });
    const res = await requestJson('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Length': Buffer.byteLength(payload),
      },
      body: payload,
    });
    if (res.status >= 400) throw new Error(`LinkedIn error: ${res.text}`);
    const postId = res.headers['x-restli-id'] || res.json?.id;
    return { id: postId, url: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined };
  },
};
