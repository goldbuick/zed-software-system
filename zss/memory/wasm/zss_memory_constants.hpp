#pragma once

namespace zss_memory {

constexpr int BOARD_WIDTH = 60;
constexpr int BOARD_HEIGHT = 25;
constexpr int BOARD_SIZE = BOARD_WIDTH * BOARD_HEIGHT;
constexpr int CHAR_WIDTH = 8;
constexpr int CHAR_HEIGHT = 14;
constexpr int CHAR_RAY_MARGIN = 3;
constexpr double LIGHTING_RAY_TILE_YSCALE =
    static_cast<double>(CHAR_HEIGHT) / static_cast<double>(CHAR_WIDTH);
constexpr const char* CORNER_EXIT_DISPUTED = "__corner_exit_disputed__";

}  // namespace zss_memory
