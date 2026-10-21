# Atlas Lab Integrated 3D — Anatomical Accuracy Review

**Review date:** 2026-10-21

## What was checked before packaging

1. **Authoritative structure reference.** The 3D-model supplier identifies Z-Anatomy and BodyParts3D as underlying geometry. The asset attribution and mixed licensing were checked against the supplier's original `LICENSE` and `NOTICE` pages (see links below).
2. **37 source-linked anatomy cards.** Names, systems, locations and short physiology/anatomy assertions were manually reconciled with the corresponding topics in OpenStax *Anatomy and Physiology 2e*. The quiz uses exactly these authored facts and answer keys. Each card links to its source chapter/section so a student can verify details.
3. **Consistency test.** Automated tests verify unique card IDs and names, populated questions and answers, valid chapter URL format, and lesson-target name correspondence. The Achilles tendon is not classified as a muscle.
4. **Geometry integrity checker.** `verify_assets.py` parses each downloaded GLB header, validates glTF 2.0 container structure and counts real mesh definitions and identifiable labels. **This is a file-integrity test, not expert medical validation.**
5. **Anatomical classification.** Material is divided into skeleton, muscular, nervous, visceral and other layers based on upstream files. Individual mesh names are kept from source `extras.za_name`, not guessed from sanitized filenames.

## Not yet verified / must remain labeled

- Full, independent review by an anatomy instructor, radiologist, or anatomist **has not been performed**. This program cannot be certified medically accurate in its entirety.
- All thousands of individual mesh positions, names, side labels, variants and morphology **have not** been individually audited against modern Terminologia Anatomica. Source geometry should not be assumed suitable for patient-level diagnostic, surgical or clinical use.
- The 3D model binaries, Three.js packages and Draco decoders could not be downloaded inside the build environment because outbound binary retrieval was unavailable. The installer is provided so the user can retrieve them from their original repositories. This means **an end-to-end anatomical WebGL render was not verified here**.
- Third-party CDN/asset host availability, local Python/browser configuration, and GPU WebGL support may affect installation. The supplied testing is static/functional and fixture-based, not an external-asset acceptance test.
- OpenStax chapter links provide topic-level traceability, not expert sign-off for every clause. Original concise summaries are not verbatim copies of the textbook.
- An adult male source-model representation does not capture normal variation by sex, age or individual anatomy; not every structure is modeled.

## Source references

- OpenStax *Anatomy and Physiology 2e*: https://openstax.org/details/books/anatomy-and-physiology-2e
- OpenStax 8: https://openstax.org/books/anatomy-and-physiology-2e/pages/8-introduction
- OpenStax 11.5: https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs
- OpenStax 11.6: https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs
- Original model atlas: https://github.com/nqwrc/3d-anatomy
- License: https://github.com/nqwrc/3d-anatomy/blob/master/LICENSE
- Notices: https://github.com/nqwrc/3d-anatomy/blob/master/NOTICE

## Release status

**Developer-built, source-linked educational release candidate.** Real dissection geometry loads locally after the initial model/engine installer succeeds. Until successfully installed and viewed on a target laptop, this is not a verified ready-to-use digital cadaver. The curriculum is not medically certified. Use with an instructor's syllabus and accredited anatomy resources.