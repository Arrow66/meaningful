.PHONY: setup install typecheck build build-firefox package package-chrome publish-chrome clean

setup: install typecheck package-chrome

install:
	npm ci

typecheck:
	npm run typecheck

build:
	npm run build

build-firefox:
	npm run build:firefox

package: package-chrome

package-chrome:
	npm run package:chrome

publish-chrome:
	npm run publish:chrome

clean:
	rm -rf .output
