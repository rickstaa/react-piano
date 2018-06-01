import React from 'react';
import { Piano } from 'react-piano';
import classNames from 'classnames';
import _ from 'lodash';

import Composer from './Composer';
import DimensionsProvider from './DimensionsProvider';
import KEYBOARD_CONFIGS from './keyboardConfigs';
import { getKeyboardShortcutMapping } from './keyboardShortcuts';
import InputManager from './InputManager';
import Oscillator from './Oscillator';
import SAMPLE_SONGS from './sampleSongs';

// TODO make component
function renderNoteLabel({ isAccidental }, { keyboardShortcut }) {
  if (!keyboardShortcut) {
    return null;
  }
  return (
    <div className="text-center">
      <div
        className={classNames({
          'NoteLabel--black': isAccidental,
          'NoteLabel--white': !isAccidental,
        })}
      >
        {keyboardShortcut}
      </div>
    </div>
  );
}

class PianoComposer extends React.Component {
  constructor(props) {
    super(props);

    // TODO: split state into multiple components
    this.state = {
      isPlaying: false,
      isRecording: true,
      notes: [],
      notesArray: [],
      notesArrayIndex: 0,
      input: {
        isMouseDown: false,
      },
    };

    this.oscillator = new Oscillator({
      audioContext: props.audioContext,
      gain: 0.1,
    });

    this.playbackIntervalHandler = null;
  }

  componentDidMount() {
    this.loadNotes(SAMPLE_SONGS.lost_woods_theme);
  }

  // TODO: refactor
  getShiftedNotesArrayIndex = (value, base) => {
    if (base === 0) {
      return 0;
    }
    return (this.state.notesArrayIndex + value + base) % base; // Need to add base to prevent negative numbers
  };

  // TODO dedupe
  getMidiNumbers() {
    return _.range(this.props.startNote, this.props.endNote + 1);
  }

  getMidiNumberForKey = (key) => {
    const mapping = getKeyboardShortcutMapping(this.getMidiNumbers(), KEYBOARD_CONFIGS.MIDDLE);
    return mapping[key];
  };

  loadNotes = (notesArray) => {
    this.setState({
      notesArray,
      notesArrayIndex: notesArray.length - 1,
    });
  };

  onRecordNotes = (midiNumbers) => {
    if (this.state.isRecording) {
      const notesArrayCopy = this.state.notesArray.slice();
      notesArrayCopy.splice(this.state.notesArrayIndex + 1, 0, midiNumbers);
      this.setState({
        notesArray: notesArrayCopy,
        notesArrayIndex: this.getShiftedNotesArrayIndex(1, notesArrayCopy.length),
      });
    }
  };

  onAddRest = () => {
    this.onRecordNotes([]);
  };

  onDeleteNote = () => {
    if (!this.state.isPlaying) {
      // Delete note at notesArrayIndex
      const notesArrayCopy = this.state.notesArray.slice();
      notesArrayCopy.splice(this.state.notesArrayIndex, 1);
      this.setState({
        notesArray: notesArrayCopy,
        notesArrayIndex: this.getShiftedNotesArrayIndex(-1, notesArrayCopy.length),
      });
    }
  };

  onStepBackward = () => {
    this.setState({
      notesArrayIndex: this.getShiftedNotesArrayIndex(-1, this.state.notesArray.length),
    });
  };

  onStepForward = () => {
    this.setState({
      notesArrayIndex: this.getShiftedNotesArrayIndex(1, this.state.notesArray.length),
    });
  };

  onClear = () => {
    this.onStop();
    this.setState({
      notesArray: [],
      notesArrayIndex: 0,
    });
  };

  onPlay = (notesArray) => {
    if (this.state.isPlaying) {
      return;
    }
    this.setState({
      isPlaying: true,
      isRecording: false,
    });
    // TODO: configurable playback timing
    this.playbackIntervalHandler = setInterval(() => {
      this.setState({
        notesArrayIndex: this.getShiftedNotesArrayIndex(1, this.state.notesArray.length),
      });
    }, 250);
  };

  onStop = () => {
    clearInterval(this.playbackIntervalHandler);
    this.setState({
      isPlaying: false,
      isRecording: true,
      notesArrayIndex: this.state.notesArray.length - 1, // Set this to end of composition so can keep writing
    });
  };

  onKeyDown = (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const midiNumber = this.getMidiNumberForKey(event.key);
    if (midiNumber) {
      this.onNoteDown(midiNumber);
    } else if (event.key === '-') {
      this.onAddRest();
    } else if (event.key === 'Backspace') {
      this.onDeleteNote();
    } else if (event.key === 'ArrowLeft') {
      this.onStepBackward();
    } else if (event.key === 'ArrowRight') {
      this.onStepForward();
    }
  };

  onKeyUp = (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const midiNumber = this.getMidiNumberForKey(event.key);
    if (midiNumber) {
      this.onNoteUp(midiNumber);
    }
  };

  onNoteDown = (midiNumber) => {
    // Prevents duplicate note firings
    if (this.state.notes.includes(midiNumber) || this.props.isLoading) {
      return;
    }
    this.setState((prevState) => ({
      notes: prevState.notes.concat(midiNumber).sort(),
    }));
    this.props.onNoteDown(midiNumber);
  };

  onNoteUp = (midiNumber) => {
    if (!this.state.notes.includes(midiNumber) || this.props.isLoading) {
      return;
    }
    this.setState((prevState) => ({
      notes: prevState.notes.filter((note) => midiNumber !== note),
    }));
    this.props.onNoteUp(midiNumber);
  };

  onMouseDown = () => {
    this.setState({
      input: Object.assign({}, this.state.input, {
        isMouseDown: true,
      }),
    });
  };

  onMouseUp = () => {
    this.setState({
      input: Object.assign({}, this.state.input, {
        isMouseDown: false,
      }),
    });
  };

  render() {
    return (
      <div>
        <InputManager
          onKeyDown={this.onKeyDown}
          onMouseDown={this.onMouseDown}
          onMouseUp={this.onMouseUp}
        />
        <div>
          <DimensionsProvider>
            {(width) => (
              <Piano
                startNote={this.props.startNote}
                endNote={this.props.endNote}
                notes={
                  this.state.isPlaying
                    ? this.state.notesArray[this.state.notesArrayIndex]
                    : this.state.notes
                }
                disabled={this.props.isLoading}
                width={width}
                gliss={this.state.input.isMouseDown}
                renderNoteLabel={renderNoteLabel}
                onNoteDown={this.onNoteDown}
                onNoteUp={this.onNoteUp}
              />
            )}
          </DimensionsProvider>
        </div>
        <Composer
          className="Composer mt-3"
          isPlaying={this.state.isPlaying}
          notesArray={this.state.notesArray}
          notesArrayIndex={this.state.notesArrayIndex}
          onAddRest={this.onAddRest}
          onDeleteNote={this.onDeleteNote}
          onClear={this.onClear}
          onPlay={this.onPlay}
          onStop={this.onStop}
          onStepForward={this.onStepForward}
          onStepBackward={this.onStepBackward}
        />
      </div>
    );
  }
}

export default PianoComposer;
