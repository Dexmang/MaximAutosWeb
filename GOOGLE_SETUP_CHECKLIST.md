# Google Setup Checklist for maximautos.com

## Items Jerry needs to complete:

### 1. Google Analytics 4
- [ ] Go to analytics.google.com
- [ ] Create new GA4 property for maximautos.com
- [ ] Get the Measurement ID (format: G-XXXXXXXXXX)
- [ ] Give ID to MaxWeb to enable tracking in Layout.astro

### 2. Google Search Console
- [ ] Go to search.google.com/search-console
- [ ] Add property: https://maximautos.com
- [ ] Verify ownership via HTML meta tag method
- [ ] Submit sitemap: https://maximautos.com/sitemap-index.xml
- [ ] Give verification code to MaxWeb to add to Layout.astro

### 3. Google Business Profile
- [ ] Go to business.google.com
- [ ] Find Maxim Autos profile
- [ ] Copy the full GBP URL (format: https://www.google.com/maps/place/...)
- [ ] Give URL to MaxWeb to add as sameAs in LocalBusiness schema
- [ ] Verify NAP matches site: "Maxim Autos", "9101 Terminal Ave, Skokie, IL 60077", "(847) 510-8947"

### 4. Once all IDs are provided:
- MaxWeb enables GA4 in Layout.astro
- MaxWeb adds GSC verification meta tag
- MaxWeb adds GBP URL to sameAs in schema
- MaxSEO submits sitemap and runs indexing request
