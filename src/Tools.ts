/*
 * Copyright (C) 2019 Sylvain Afchain
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */


export default class Tools {

    static prettyBytes(value: number) {
        var g = Math.floor(value / 1000000000)
        var m = Math.floor((value - g * 1000000000) / 1000000)
        var k = Math.floor((value - g * 1000000000 - m * 1000000) / 1000)
        var b = value - g * 1000000000 - m * 1000000 - k * 1000

        if (g) return g + "Gb (" + value.toLocaleString() + " bytes)"
        if (m) return m + "Mb (" + value.toLocaleString() + " bytes)"
        if (k) return k + "Kb (" + value.toLocaleString() + " bytes)"

        return b.toLocaleString() + " bytes"
    }

    static prettyBandwidth(value: number) {
        var g = Math.floor(value / 1000000000)
        var m = Math.floor((value - g * 1000000000) / 1000000)
        var k = Math.floor((value - g * 1000000000 - m * 1000000) / 1000)
        var b = value - g * 1000000000 - m * 1000000 - k * 1000

        if (g) return g + "Gbit/s"
        if (m) return m + "Mbit/s"
        if (k) return k + "Kbit/s"

        return b.toLocaleString() + " bit/s"
    }
}