# Quran Search Text Source

Tadabor keeps the Uthmani Quran text in `src/data/quranData.json` as the display/copy source.

The search index uses a separate ordinary-Arabic (Simple/Clean) ayah representation. The build fetches a pinned copy of `quran-simple-clean.txt` from `lafzi/quran_fts` at commit `76c7a622f2fd830c06e36d8f6210e620e0698bd2` and maps it by `(surahId, ayahId)` to the original Uthmani ayah.

Source repositories:
- https://github.com/lafzi/quran_fts
- https://tanzil.net/

The search source is used only to build the search representation. It is not used for display or copying.
