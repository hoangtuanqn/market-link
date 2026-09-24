# SearchBar

Site-wide search (FR-023): pick a scope (Everything / Markets / Stalls / Products), then type a keyword.

- The consumer passes `scope`, `placeholder`, `defaultValue`, `onSearch(q, scope)`. To change the scope list, pass `scopes: [[value, label], …]`.
- The results page always shows the list and the map side by side (`MapPin`). On mobile, a toggle switches between list and map.

Preview: [reference gallery](../reference/gallery.html#c-SearchBar)
