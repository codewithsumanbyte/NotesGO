import { NextRequest, NextResponse } from 'next/server';
import { extractGoogleDriveFileId } from '@/lib/gdrive';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get('fileId') || '';
  const fileId = extractGoogleDriveFileId(rawId) || rawId;

  if (!fileId) {
    return new NextResponse('Missing or invalid fileId parameter', { status: 400 });
  }

  try {
    const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    // Request with standard browser User-Agent
    const res = await fetch(initialUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type') || '';

    // If Google returned an HTML page (virus scan confirmation for >100MB, or permissions page)
    if (contentType.includes('text/html')) {
      const html = await res.text();
      const cookies = res.headers.get('set-cookie') || '';

      // Pattern A: Direct download link in uc-download-link or form action
      const directLinkMatch = 
        html.match(/id="uc-download-link"[^>]*href="([^"]+)"/i) ||
        html.match(/action="(https:\/\/[^"]*drive\.usercontent\.google\.com\/download[^"]*)"/i) ||
        html.match(/href="(https:\/\/[^"]*drive\.usercontent\.google\.com\/download[^"]*)"/i);

      let targetDownloadUrl: string | null = null;
      if (directLinkMatch && directLinkMatch[1]) {
        targetDownloadUrl = directLinkMatch[1].replace(/&amp;/g, '&');
      }

      // Pattern B: Form with confirm code and uuid (Google Drive large file virus warning)
      if (!targetDownloadUrl) {
        const confirmMatch =
          html.match(/confirm=([^&"'>\s]+)/i) ||
          html.match(/name="confirm"\s+value="([^"'>\s]+)"/i) ||
          html.match(/value="([^"'>\s]+)"\s+name="confirm"/i);

        const uuidMatch =
          html.match(/uuid=([^&"'>\s]+)/i) ||
          html.match(/name="uuid"\s+value="([^"'>\s]+)"/i);

        if (confirmMatch && confirmMatch[1]) {
          const confirmToken = confirmMatch[1];
          const uuidParam = uuidMatch && uuidMatch[1] ? `&uuid=${uuidMatch[1]}` : '';
          targetDownloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmToken}${uuidParam}`;
        }
      }

      if (targetDownloadUrl) {
        const confirmedRes = await fetch(targetDownloadUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...(cookies ? { Cookie: cookies } : {}),
          },
          redirect: 'follow',
        });

        if (confirmedRes.ok) {
          return new NextResponse(confirmedRes.body, {
            headers: {
              'Content-Type': 'application/pdf',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
      }

      // If still HTML and no download link, check if permission is denied
      if (html.includes('accounts.google.com') || html.includes('Permission denied') || html.includes('Access denied') || html.includes('Sign in')) {
        return new NextResponse(
          'Google Drive access restricted. Please ensure sharing is set to "Anyone with the link can view".',
          { status: 403 }
        );
      }

      return new NextResponse(
        'Unable to bypass Google Drive scan confirmation. You can still view it via Drive Stream Viewer.',
        { status: 422 }
      );
    }

    // Direct binary stream
    return new NextResponse(res.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error proxying Google Drive PDF:', error);
    return new NextResponse(error?.message || 'Failed to stream Google Drive PDF', {
      status: 500,
    });
  }
}
