ng build --configuration production --base-href "https://mahmoudxkhaled.github.io/ERP-front/"

npx angular-cli-ghpages --dir=dist/ERP-front --no-silent

ng build --configuration=production

npx ng build --output-path=dist/ERP-front --base-href=/ERP-front/

````
2) Deploy:
```bash
npx angular-cli-ghpages --dir=dist/ERP-front --no-silent
````
