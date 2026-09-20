from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import re
class Handler(SimpleHTTPRequestHandler):
 def send_head(self):
  p=Path(self.translate_path(self.path))
  if p.is_file() and 'Range' in self.headers:
   size=p.stat().st_size;m=re.match(r'bytes=(\d+)-(\d*)',self.headers['Range'])
   if m:
    start=int(m[1]);end=min(int(m[2]) if m[2] else size-1,size-1)
    self.send_response(206);self.send_header('Content-Type',self.guess_type(str(p)));self.send_header('Accept-Ranges','bytes');self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(end-start+1));self.end_headers()
    f=p.open('rb');f.seek(start);self.remaining=end-start+1;return f
  self.remaining=None;return super().send_head()
 def copyfile(self,source,outputfile):
  if self.remaining is None:return super().copyfile(source,outputfile)
  while self.remaining>0:
   b=source.read(min(self.remaining,65536))
   if not b:break
   try: outputfile.write(b)
   except (BrokenPipeError, ConnectionResetError): break
   self.remaining-=len(b)
ThreadingHTTPServer(('127.0.0.1',8091),Handler).serve_forever()
