# Trust anchors for the client-preview FTPS deploy

`deploy-client-preview.yml` uploads to the cPanel host over FTPS. Two things about
that host's TLS make the runner's default trust store insufficient, and neither is
a reason to turn certificate verification off:

1. **The certificate is issued for `rev6.web-dns1.com`**, the shared hosting server's
   own name — not for `ftp.clear.muskokadigitalboost.ca`, which is just an alias
   pointing at it. So the workflow connects to `rev6.web-dns1.com` by name, and
   hostname verification passes on its own terms.

2. **The server sends only its leaf certificate**, without the intermediate. Its
   chain is Let's Encrypt's newer generation — `YR1`, issued by `ISRG Root YR` —
   and neither is in `ca-certificates` yet (which carries ISRG Root X1 and X2).
   Without the intermediate there is no path to build, which is why lftp reported
   "the certificate is NOT trusted. The certificate issuer is unknown."

So both are supplied here and appended to the system bundle at deploy time:

| file | subject | issuer | expires |
|---|---|---|---|
| `int-yr1.pem` | `C=US, O=Let's Encrypt, CN=YR1` | `C=US, O=ISRG, CN=Root YR` | 2028-09-02 |
| `root-yr.pem` | `C=US, O=ISRG, CN=Root YR` | self-signed | 2045-09-02 |

Both were downloaded from `https://letsencrypt.org/certs/gen-y/` over TLS validated
by the existing trust store, so they are not trust-on-first-use. Verified with:

```sh
openssl verify -CAfile root-yr.pem -untrusted int-yr1.pem leaf.pem   # leaf.pem: OK
```

SHA-256 fingerprints, should you want to check them against a published source:

```
int-yr1.pem  13:94:96:34:D9:9C:D6:FD:6A:A8:0B:C0:34:FE:FA:CC:EB:19:69:FE:EF:98:65:86:71:3E:CD:BB:05:75:8D:3F
root-yr.pem  E5:7B:7E:6F:15:0C:41:91:02:E8:D5:C0:55:72:9F:F9:67:B9:D1:A8:29:BF:00:CE:C8:9C:A6:04:EB:F4:A8:6F
```

These are public certificates, not secrets. Nothing here is published with the site —
the deploy excludes `.github` from what it uploads.

If the host ever moves the account to a different server, the FTPS certificate will
be issued for that server's name instead and the deploy will fail on the hostname.
Update `FTP_SERVER` in the workflow to the new name; refresh these files only if
Let's Encrypt's chain has also changed.
