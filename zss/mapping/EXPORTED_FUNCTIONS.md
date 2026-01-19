# Mapping Module - Exported Functions Summary

## ID Generation & Validation

### Session & Process IDs
- **createsid()** - Creates a session ID with format `sid_` prefix
- **issid(id)** - Type guard to check if a value is a valid session ID
- **createpid()** - Creates a process ID with format `pid_` prefix
- **ispid(id)** - Type guard to check if a value is a valid process ID
- **createtopic()** - Creates a unique topic ID using nanoid

### Name Generation
- **createnameid()** - Generates a human-readable name ID with adjectives
- **createshortnameid()** - Generates a shorter human-readable name ID without adverbs

### Hash Generation
- **createinfohash(source)** - Creates a deterministic info hash from a source string using Alea PRNG

## Array Operations

### Array Generation
- **range(a, b?, step?)** - Generates an array of numbers from a to b with optional step

### Random Selection
- **pick(...args)** - Randomly picks one item from provided arguments (flattened)
- **pickwith(seed, ...args)** - Randomly picks one item using a seed-based RNG

### Immutable Array Modifications
- **addToArray(array, value)** - Returns new array with value appended
- **setIndex(array, index, value)** - Returns new array with value at index replaced
- **removeIndex(array, index)** - Returns new array with item at index removed
- **setAtIndex(array, index, value)** - Alias for setIndex
- **applyToIndex(array, index, props)** - Merges props into object at index (immutable)
- **removeFromIndex(array, index, key)** - Removes key from object at index (immutable)

### Array Search
- **findIndexByKey(array, key, value)** - Finds index of first item where key matches value
- **findByKey(array, key, value)** - Finds first item where key matches value

### Array Utilities
- **notEmpty(value)** - Type guard to filter out null/undefined values
- **unique(values)** - Returns array of unique values with null/undefined filtered
- **average(...maybevalues)** - Calculates average of numeric values (filters out undefined/null)

## 2D Coordinate & Point Operations

### Index Conversion
- **indextox(index, width)** - Converts linear index to x coordinate
- **indextoy(index, width)** - Converts linear index to y coordinate
- **indextopt(index, width)** - Converts linear index to point {x, y}
- **pttoindex(pt, width)** - Converts point {x, y} to linear index

### Point Geometry
- **ptdist(pt1, pt2)** - Calculates Euclidean distance between two points
- **ptstoarea(p1, p2)** - Converts two points to area string format "x1,y1,x2,y2"
- **ptwithin(x, y, top, right, bottom, left)** - Checks if point (x, y) is within rectangle bounds

### Point Generation
- **rectpoints(x0, y0, x1, y1)** - Generates array of all points within rectangle (inclusive)
- **linepoints(x0, y0, x1, y1)** - Generates array of points along line using Bresenham's algorithm

## Number Operations

### Math Utilities
- **clamp** - Re-exported from maath/misc
- **makeeven(value)** - Rounds value down to nearest even number
- **snap(value, snap)** - Snaps value to nearest multiple of snap value

### Random Number Generation
- **randomnumber()** - Generates random number 0-1 using seeded PRNG
- **randomnumberwith(seed)** - Generates random number 0-1 using seed-based PRNG
- **randominteger(a, b)** - Generates random integer between a and b (inclusive)
- **randomintegerwith(seed, a, b)** - Generates random integer using seed-based PRNG

## String Operations

### String Manipulation
- **stringsplice(str, index, count, insert?)** - Splices string by removing count characters at index and optionally inserting new string

### String Parsing
- **totarget(scope)** - Parses scope string to extract target and label, returns [target, label] tuple

## Value & Type Mapping

### Type Conversion
- **maptostring(value)** - Converts value to string with empty string fallback
- **maptonumber(arg, defaultvalue)** - Converts value to number with default fallback
- **maptovalue(arg, defaultvalue)** - Returns arg if type matches defaultvalue type, otherwise returns defaultvalue

## Type Checking & Utilities

### Types
- **MAYBE<T>** (type) - Optional type T | undefined

### Equality & Presence
- **isequal** - Re-exported from react-fast-compare
- **ispresent** - Re-exported from ts-extras (checks if value is not null/undefined)

### Type Guards
- **isboolean(word)** - Type guard for boolean values
- **isnumber(word)** - Type guard for valid number values (excludes NaN)
- **ismaybenumber(word)** - Type guard for number or undefined
- **isstring(word)** - Type guard for string values
- **ismaybestring(word)** - Type guard for string or undefined
- **isarray(word)** - Type guard for array values
- **ismaybearray(word)** - Type guard for array or undefined
- **isbook(value)** - Type guard for book object structure (id, name, flags, players, pages)

### Utilities
- **deepcopy(word)** - Creates deep clone of object
- **noop(item)** - Identity function, returns item unchanged

## Animation

### Snap Functions
- **animsnapy(value)** - Snaps value to character height grid (half-height increments)
- **animsnapx(value)** - Snaps value to character width grid (half-width increments)

### Animation Control
- **animpositiontotarget(object, axis, target, delta, velocity?)** - Animates object position to target using damped easing, returns completion status

## QR Code

### QR Code Rendering
- **qrlines(content)** - Generates QR code as array of strings using Unicode block characters mapped to PETSCII codes

## Timing

### Async Utilities
- **waitfor(ms)** - Returns promise that resolves after specified milliseconds

### Constants
- **TICK_RATE** - Tick rate constant (currently 80ms)
- **TICK_FPS** - Calculated frames per second from TICK_RATE
- **CYCLE_DEFAULT** - Default cycle value (3)

## Async Error Handling

### Error Management
- **doasync(device, player, asyncfunc)** - Executes async function with error handling, reports crashes to device API

