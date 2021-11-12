# Upload file to B2

This action uploads a file from the file system to Backblaze B2.

This is a JavaScript action, so no dependencies are required, and it works on all architectures.

Failed requests automatically retry with exponential backoff, with up to 3 attempts for each request.

## Usage

```yaml
name: Upload file
uses: wilsonzlin/b2-upload-action@v1
id: upload
with:
  bucket: my-bucket
  uploadKey: destination/key/in/bucket
  keyId: ${{ secrets.KEY_ID }}
  applicationKey: ${{ secrets.APPLICATION_KEY }}
  file: test.txt
  contentType: text/plain; charset=UTF-8
```

## Outputs

```json
{
  "bucketId": "0123456789abcdef",
  "contentLength": "42",
  "contentSha1": "0123456789abcdef0123456789abcdef01234567",
  "contentMd5": "0123456789abcdef0123456789abcdef",
  "contentType": "text/plain; charset=UTF-8",
  "fileId": "1_zjh34u_32489jh_ajsd349_asjd",
  "fileInfo": "{}",
  "fileName": "",
  "fileRetention": "{\"isClientAuthorizedToRead\":false,\"value\":null}",
  "legalHold": "{\"isClientAuthorizedToRead\":false,\"value\":null}",
  "serverSideEncryption": "{\"algorithm\":null,\"mode\":null}"
}
```
