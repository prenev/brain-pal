fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build the app and upload it to TestFlight

### ios metadata

```sh
[bundle exec] fastlane ios metadata
```

Upload listing text, review notes and age rating (no binary, no screenshots, does not submit)

### ios submit

```sh
[bundle exec] fastlane ios submit
```

Submit the newest processed build for App Review (manual release after approval)

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Upload App Store screenshots (6.9-inch and 6.5-inch sets from store/screenshots)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
