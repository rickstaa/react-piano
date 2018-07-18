import React from 'react';
import PropTypes from 'prop-types';
import range from 'lodash.range';

import Key from './Key';
import MidiNumbers from './MidiNumbers';

function isNaturalMidiNumber(value) {
  if (typeof value !== 'number') {
    return false;
  }
  return MidiNumbers.NATURAL_MIDI_NUMBERS.includes(value);
}

function noteRangePropType(props, propName, componentName) {
  const { first, last } = props[propName];
  if (!first || !last) {
    return new Error(
      `Invalid prop ${propName} supplied to ${componentName}. ${propName} must be an object with .first and .last values.`,
    );
  }
  if (!isNaturalMidiNumber(first) || !isNaturalMidiNumber(last)) {
    return new Error(
      `Invalid prop ${propName} supplied to ${componentName}. ${propName} values must be valid MIDI numbers, and should not be accidentals (sharp or flat notes).`,
    );
  }
  if (first >= last) {
    return new Error(
      `Invalid prop ${propName} supplied to ${componentName}. ${propName}.first must be smaller than ${propName}.last.`,
    );
  }
}

class Keyboard extends React.PureComponent {
  static propTypes = {
    noteRange: noteRangePropType,
    activeNotes: PropTypes.arrayOf(PropTypes.number),
    onPlayNote: PropTypes.func.isRequired,
    onStopNote: PropTypes.func.isRequired,
    renderNoteLabel: PropTypes.func.isRequired,
    keyHeightRatio: PropTypes.number.isRequired,
    disabled: PropTypes.bool,
    gliss: PropTypes.bool,
    useTouchEvents: PropTypes.bool,
    // If width is not provided, must have fixed width and height in parent container
    width: PropTypes.number,
    layoutConfig: PropTypes.object,
  };

  static defaultProps = {
    disabled: false,
    gliss: false,
    useTouchEvents: false,
    keyHeightRatio: 4.55,
    renderNoteLabel: () => {},
  };

  // Range of midi numbers on keyboard
  getMidiNumbers() {
    return range(this.props.noteRange.first, this.props.noteRange.last + 1);
  }

  getWhiteKeyCount() {
    return this.getMidiNumbers().filter((number) => {
      const { isAccidental } = MidiNumbers.getAttributes(number);
      return !isAccidental;
    }).length;
  }

  // Width of the white key as a ratio from 0 to 1, including the small space between keys
  getWhiteKeyWidth() {
    return 1 / this.getWhiteKeyCount();
  }

  getWidth() {
    return this.props.width ? this.props.width : '100%';
  }

  getHeight() {
    if (!this.props.width) {
      return '100%';
    }
    const keyWidth = this.props.width * this.getWhiteKeyWidth();
    return `${keyWidth * this.props.keyHeightRatio}px`;
  }

  render() {
    return (
      <div
        className="ReactPiano__Keyboard"
        style={{ width: this.getWidth(), height: this.getHeight() }}
      >
        {this.getMidiNumbers().map((midiNumber) => {
          const { note, basenote, isAccidental } = MidiNumbers.getAttributes(midiNumber);
          const isActive = this.props.activeNotes.includes(midiNumber);
          return (
            <Key
              widthRatio={this.getWhiteKeyWidth()}
              midiNumber={midiNumber}
              noteRange={this.props.noteRange}
              active={isActive}
              accidental={isAccidental}
              disabled={this.props.disabled}
              onPlayNote={this.props.onPlayNote}
              onStopNote={this.props.onStopNote}
              gliss={this.props.gliss}
              useTouchEvents={this.props.useTouchEvents}
              layoutConfig={this.props.layoutConfig}
              key={midiNumber}
            >
              {this.props.disabled
                ? null
                : this.props.renderNoteLabel({
                    isActive,
                    isAccidental,
                    midiNumber,
                  })}
            </Key>
          );
        })}
      </div>
    );
  }
}

export default Keyboard;
